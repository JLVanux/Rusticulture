"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Genome, PlanteId } from "@/data/game";
import { formatGenome, parseGenome } from "@/lib/crossbreed";
import { useBanque, type Graine } from "@/lib/hooks";
import { supabase, supabaseConfigure } from "@/lib/supabase";
import { idUnique, useStockage } from "@/lib/storage";
import { peutEcrire, useFermes, useSession, type RoleFerme, type Wipe } from "@/lib/compte";

// -----------------------------------------------------------------------------
// Une seule interface pour deux stockages.
//
// Les graines vivent soit dans le navigateur, soit dans la ferme partagée. Les
// pages ne doivent pas avoir à le savoir : elles demandent des graines et des
// actions, la source est choisie ici.
//
// C'est la seule abstraction de ce genre dans le projet, et c'est volontaire :
// les graines sont la seule donnée qui existe réellement des deux côtés. Rien
// ne sert d'abstraire par avance ce qui n'a qu'une implémentation.
// -----------------------------------------------------------------------------

export interface GraineUnifiee {
  id: string;
  genome: Genome;
  quantite: number;
  plante: PlanteId;
  note?: string;
}

export type SourceGraines = "local" | "ferme";

/** La ferme sélectionnée, avec son rôle et son wipe actif. */
export function useFermeActive() {
  const { connecte } = useSession();
  const { fermes, charge: fermesChargees } = useFermes();
  const [choix, setChoix] = useStockage<string | null>("ferme-active", null);
  const [wipe, setWipe] = useState<Wipe | null>(null);
  const [charge, setCharge] = useState(false);

  const courante = useMemo(
    () => fermes.find((f) => f.ferme.id === choix) ?? fermes[0] ?? null,
    [fermes, choix]
  );

  useEffect(() => {
    const sb = supabase();
    if (!sb || !courante) {
      setWipe(null);
      setCharge(fermesChargees);
      return;
    }
    let annule = false;
    setCharge(false);
    sb.from("wipes")
      .select("*")
      .eq("ferme_id", courante.ferme.id)
      .eq("actif", true)
      .maybeSingle()
      .then(({ data }) => {
        if (annule) return;
        setWipe((data as Wipe) ?? null);
        setCharge(true);
      });
    return () => {
      annule = true;
    };
  }, [courante, fermesChargees]);

  return {
    ferme: courante?.ferme ?? null,
    role: (courante?.role ?? null) as RoleFerme | null,
    wipe,
    charge: charge && fermesChargees,
    connecte,
    choisir: setChoix,
    fermes,
  };
}

/** Trace une action dans le journal de la ferme. Les échecs sont ignorés :
 *  un journal manquant ne doit jamais empêcher l'action elle-même. */
export async function journaliser(wipeId: string, type: string, donnees: Record<string, unknown> = {}) {
  const sb = supabase();
  if (!sb) return;
  const { data } = await sb.auth.getUser();
  if (!data.user) return;
  await sb.from("activites").insert({ wipe_id: wipeId, acteur: data.user.id, type, donnees });
}

interface LigneGraine {
  id: string;
  plante: string;
  genes: string;
  quantite: number;
  note: string | null;
}

export function useGraines(plante?: PlanteId) {
  const { ferme, role, wipe, charge: fermeChargee } = useFermeActive();
  const [banqueLocale, setBanqueLocale, banqueChargee] = useBanque();

  const [distantes, setDistantes] = useState<GraineUnifiee[]>([]);
  const [chargeDistant, setChargeDistant] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const { connecte } = useSession();

  // Tant que la ferme n'est pas résolue, on ne sait pas où écrire. Écrire quand
  // même enverrait la graine dans le navigateur alors qu'elle devait aller dans
  // la ferme — perte silencieuse, la pire espèce.
  const enAttente = supabaseConfigure && connecte && !fermeChargee;

  const source: SourceGraines = supabaseConfigure && wipe ? "ferme" : "local";
  const modifiable = !enAttente && (source === "local" || peutEcrire(role));

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipe) {
      setDistantes([]);
      setChargeDistant(true);
      return;
    }
    const { data, error } = await sb
      .from("graines")
      .select("id, plante, genes, quantite, note")
      .eq("wipe_id", wipe.id);

    if (error) {
      setErreur(error.message);
    } else {
      setErreur(null);
      const converties: GraineUnifiee[] = [];
      for (const l of data as LigneGraine[]) {
        const genome = parseGenome(l.genes);
        // Une ligne illisible est ignorée plutôt que de faire échouer tout
        // l'affichage : la contrainte en base rend le cas improbable.
        if (!genome) continue;
        converties.push({
          id: l.id,
          genome,
          quantite: l.quantite,
          plante: l.plante as PlanteId,
          note: l.note ?? undefined,
        });
      }
      setDistantes(converties);
    }
    setChargeDistant(true);
  }, [wipe]);

  useEffect(() => {
    if (source === "ferme") void recharger();
    else setChargeDistant(true);
  }, [source, recharger]);

  const toutes: GraineUnifiee[] = source === "ferme" ? distantes : banqueLocale;
  const graines = plante ? toutes.filter((g) => g.plante === plante) : toutes;

  // --- Actions ---------------------------------------------------------------

  const ajouterLot = useCallback(
    async (genomes: Genome[], p: PlanteId, origine: "manuel" | "scan" | "import" = "manuel") => {
      if (genomes.length === 0 || !modifiable) return;

      if (source === "local") {
        setBanqueLocale((prec) => {
          const suivant = [...prec];
          for (const genome of genomes) {
            const code = formatGenome(genome);
            const i = suivant.findIndex((g) => formatGenome(g.genome) === code && g.plante === p);
            if (i >= 0) suivant[i] = { ...suivant[i], quantite: suivant[i].quantite + 1 };
            else suivant.push({ id: idUnique(), genome, quantite: 1, plante: p } as Graine);
          }
          return suivant;
        });
        return;
      }

      const sb = supabase();
      if (!sb || !wipe) return;

      // Regroupé avant l'envoi : un seul appel par génome distinct.
      const compte = new Map<string, number>();
      for (const g of genomes) {
        const code = formatGenome(g);
        compte.set(code, (compte.get(code) ?? 0) + 1);
      }

      for (const [code, quantite] of compte) {
        const { error } = await sb.rpc("ajouter_graine", {
          p_wipe: wipe.id,
          p_plante: p,
          p_genes: code,
          p_quantite: quantite,
          p_origine: origine,
        });
        if (error) {
          setErreur(error.message);
          return;
        }
      }

      await journaliser(wipe.id, "graines_ajoutees", {
        nombre: genomes.length,
        plante: p,
        origine,
      });


      await recharger();
    },
    [source, modifiable, setBanqueLocale, wipe, ferme, recharger]
  );

  const ajuster = useCallback(
    async (id: string, delta: number) => {
      if (!modifiable) return;

      if (source === "local") {
        setBanqueLocale((prec) =>
          prec
            .map((g) => (g.id === id ? { ...g, quantite: g.quantite + delta } : g))
            .filter((g) => g.quantite > 0)
        );
        return;
      }

      const sb = supabase();
      if (!sb) return;
      const { error } = await sb.rpc("ajuster_graine", { p_id: id, p_delta: delta });
      if (error) setErreur(error.message);
      await recharger();
    },
    [source, modifiable, setBanqueLocale, recharger]
  );

  const viderTout = useCallback(
    async (p?: PlanteId) => {
      if (!modifiable) return;

      if (source === "local") {
        setBanqueLocale((prec) => (p ? prec.filter((g) => g.plante !== p) : []));
        return;
      }

      const sb = supabase();
      if (!sb || !wipe) return;
      let requete = sb.from("graines").delete().eq("wipe_id", wipe.id);
      if (p) requete = requete.eq("plante", p);
      const { error } = await requete;
      if (error) setErreur(error.message);
      else await journaliser(wipe.id, "graines_videes", { plante: p ?? "toutes" });
      await recharger();
    },
    [source, modifiable, setBanqueLocale, wipe, ferme, recharger]
  );

  /** Copie la banque du navigateur vers la ferme. Le local n'est pas effacé :
   *  mieux vaut un doublon qu'une perte. */
  const transfererDepuisLocal = useCallback(async () => {
    if (source !== "ferme" || !wipe || banqueLocale.length === 0 || !modifiable) return 0;
    const sb = supabase();
    if (!sb) return 0;

    let transferees = 0;
    for (const g of banqueLocale) {
      const { error } = await sb.rpc("ajouter_graine", {
        p_wipe: wipe.id,
        p_plante: g.plante,
        p_genes: formatGenome(g.genome),
        p_quantite: g.quantite,
        p_origine: "import",
      });
      if (error) {
        setErreur(error.message);
        break;
      }
      transferees += g.quantite;
    }

    if (transferees > 0) {
      await journaliser(wipe.id, "banque_importee", { nombre: transferees });
      // La banque locale est vidée une fois la copie confirmée. Sans ça, le
      // bouton reste proposé et un second clic doublerait les quantités, la
      // fonction d'ajout étant incrémentale.
      setBanqueLocale([]);
      await recharger();
    }
    return transferees;
  }, [source, wipe, banqueLocale, modifiable, recharger, setBanqueLocale]);

  return {
    graines,
    toutes,
    source,
    modifiable,
    ferme,
    role,
    wipe,
    erreur,
    charge: !enAttente && (source === "ferme" ? chargeDistant && fermeChargee : banqueChargee),
    enAttente,
    nbLocal: banqueLocale.reduce((a, g) => a + g.quantite, 0),
    ajouterLot,
    ajuster,
    viderTout,
    transfererDepuisLocal,
    recharger,
  };
}
