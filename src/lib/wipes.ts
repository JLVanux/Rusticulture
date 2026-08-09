"use client";

import { useCallback, useEffect, useState } from "react";
import { peutEcrire } from "@/lib/compte";
import { scoreGenome, parseGenome } from "@/lib/crossbreed";
import { journaliser, useFermeActive } from "@/lib/graines";
import { CONTENANT_PAR_ID, type Contenant } from "@/lib/plantations";
import { supabase } from "@/lib/supabase";
import type { Genome } from "@/data/game";

// -----------------------------------------------------------------------------
// Wipes
//
// Le wipe est le conteneur de toutes les données temporelles. En clôturer un
// n'efface rien : il cesse d'être actif, et reste consultable indéfiniment.
//
// Clôture et démarrage passent par des fonctions en base, parce que les deux
// doivent se faire ensemble. En deux appels depuis le navigateur, un échec au
// milieu laisserait la ferme sans wipe actif.
// -----------------------------------------------------------------------------

export interface WipeComplet {
  id: string;
  nom: string;
  serveur: string | null;
  debut: string;
  fin: string | null;
  actif: boolean;
  nbJoueurs: number | null;
}

interface LigneWipe {
  id: string;
  nom: string;
  serveur: string | null;
  debut: string;
  fin: string | null;
  actif: boolean;
  nb_joueurs: number | null;
}

export function useWipes() {
  const { ferme, role, charge: fermeChargee } = useFermeActive();
  const [wipes, setWipes] = useState<WipeComplet[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Seul le propriétaire gère les wipes — c'est appliqué par les politiques,
  // ceci ne sert qu'à griser les boutons.
  const estProprietaire = role === "proprietaire";

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !ferme) {
      setWipes([]);
      setCharge(true);
      return;
    }
    const { data, error } = await sb
      .from("wipes")
      .select("id, nom, serveur, debut, fin, actif, nb_joueurs")
      .eq("ferme_id", ferme.id)
      .order("debut", { ascending: false });

    if (error) setErreur(error.message);
    else {
      setErreur(null);
      setWipes(
        ((data as LigneWipe[]) ?? []).map((l) => ({
          id: l.id,
          nom: l.nom,
          serveur: l.serveur,
          debut: l.debut,
          fin: l.fin,
          actif: l.actif,
          nbJoueurs: l.nb_joueurs,
        }))
      );
    }
    setCharge(true);
  }, [ferme]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const cloturer = useCallback(
    async (wipeId: string) => {
      const sb = supabase();
      if (!sb || !estProprietaire) return;
      const { error } = await sb.rpc("cloturer_wipe", { p_wipe: wipeId });
      if (error) setErreur(error.message);
      else await journaliser(wipeId, "wipe_cloture", {});
      await recharger();
    },
    [estProprietaire, recharger]
  );

  const demarrer = useCallback(
    async (nom: string, serveur: string, nbJoueurs: number | null) => {
      const sb = supabase();
      if (!sb || !ferme || !estProprietaire) return null;
      const { data, error } = await sb.rpc("demarrer_wipe", {
        p_ferme: ferme.id,
        p_nom: nom.trim(),
        p_serveur: serveur.trim() || null,
        p_nb_joueurs: nbJoueurs,
      });
      if (error) {
        setErreur(error.message);
        return null;
      }
      if (data) await journaliser(data as string, "wipe_demarre", { nom });
      await recharger();
      return data as string;
    },
    [ferme, estProprietaire, recharger]
  );

  const rouvrir = useCallback(
    async (wipeId: string) => {
      const sb = supabase();
      if (!sb || !estProprietaire) return;
      const { error } = await sb.rpc("rouvrir_wipe", { p_wipe: wipeId });
      if (error) setErreur(error.message);
      await recharger();
    },
    [estProprietaire, recharger]
  );

  return {
    wipes,
    ferme,
    estProprietaire,
    peutModifier: peutEcrire(role),
    charge: charge && fermeChargee,
    erreur,
    cloturer,
    demarrer,
    rouvrir,
    recharger,
  };
}

// -----------------------------------------------------------------------------
// Résumé d'un wipe
//
// Entièrement recalculé à partir des faits enregistrés sur ce wipe. Aucun total
// n'est figé au moment de la clôture : rouvrir un wipe et y ajouter une récolte
// met le résumé à jour tout seul.
// -----------------------------------------------------------------------------

export interface ResumeWipe {
  totaux: { ressource: string; total: number }[];
  nombreRecoltes: number;
  meilleureRecolte: { ressource: string; quantite: number } | null;
  nombreGraines: number;
  meilleursGenes: Genome | null;
  plantsDeclares: number;
  objectifsAtteints: number;
  objectifsTotal: number;
  jours: number;
}

export function useResumeWipe(wipeId: string | null) {
  const [resume, setResume] = useState<ResumeWipe | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !wipeId) {
      setResume(null);
      setCharge(true);
      return;
    }
    let annule = false;
    setCharge(false);

    (async () => {
      const [recoltes, graines, plantations, objectifs, wipe] = await Promise.all([
        sb.from("recoltes").select("ressource, quantite").eq("wipe_id", wipeId),
        sb.from("graines").select("genes, quantite").eq("wipe_id", wipeId),
        sb.from("plantations").select("contenant, quantite").eq("wipe_id", wipeId),
        sb.from("objectifs").select("id, atteint_le").eq("wipe_id", wipeId),
        sb.from("wipes").select("debut, fin").eq("id", wipeId).maybeSingle(),
      ]);
      if (annule) return;

      const parRessource = new Map<string, number>();
      let meilleure: ResumeWipe["meilleureRecolte"] = null;
      for (const r of (recoltes.data ?? []) as { ressource: string; quantite: number }[]) {
        parRessource.set(r.ressource, (parRessource.get(r.ressource) ?? 0) + r.quantite);
        if (!meilleure || r.quantite > meilleure.quantite) {
          meilleure = { ressource: r.ressource, quantite: r.quantite };
        }
      }

      let meilleursGenes: Genome | null = null;
      let meilleurScore = -Infinity;
      let nombreGraines = 0;
      for (const g of (graines.data ?? []) as { genes: string; quantite: number }[]) {
        nombreGraines += g.quantite;
        const genome = parseGenome(g.genes);
        if (!genome) continue;
        const score = scoreGenome(genome);
        if (score > meilleurScore) {
          meilleurScore = score;
          meilleursGenes = genome;
        }
      }

      const plantsDeclares = ((plantations.data ?? []) as { contenant: string; quantite: number }[]).reduce(
        (a, p) => a + (CONTENANT_PAR_ID[p.contenant as Contenant]?.plants ?? 1) * p.quantite,
        0
      );

      const listeObjectifs = (objectifs.data ?? []) as { id: string; atteint_le: string | null }[];

      const infos = wipe.data as { debut: string; fin: string | null } | null;
      const debut = infos ? new Date(infos.debut).getTime() : Date.now();
      const fin = infos?.fin ? new Date(infos.fin).getTime() : Date.now();
      const jours = Math.max(1, Math.round((fin - debut) / 86_400_000) + 1);

      setResume({
        totaux: [...parRessource.entries()]
          .map(([ressource, total]) => ({ ressource, total }))
          .sort((a, b) => b.total - a.total),
        nombreRecoltes: (recoltes.data ?? []).length,
        meilleureRecolte: meilleure,
        nombreGraines,
        meilleursGenes,
        plantsDeclares,
        // Les objectifs de production et de génétique n'ont pas de date
        // d'atteinte : leur progression se recalcule. Seuls les objectifs libres
        // sont comptés ici, faute de pouvoir rejouer le contexte du wipe clos.
        objectifsAtteints: listeObjectifs.filter((o) => o.atteint_le).length,
        objectifsTotal: listeObjectifs.length,
        jours,
      });
      setCharge(true);
    })();

    return () => {
      annule = true;
    };
  }, [wipeId]);

  return { resume, charge };
}
