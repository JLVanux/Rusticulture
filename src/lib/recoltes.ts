"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PLANTES } from "@/data/game";
import { peutEcrire } from "@/lib/compte";
import { journaliser, useFermeActive } from "@/lib/graines";
import { useProductionEstimee, usePlantations, type LigneProduction } from "@/lib/plantations";
import { supabase } from "@/lib/supabase";

// -----------------------------------------------------------------------------
// Récoltes
//
// Une récolte est un FAIT : quelqu'un a ramassé une quantité à un instant. Tout
// le reste — totaux, moyennes, efficacité — se recalcule à partir de ces faits.
// Rien de dérivé n'est stocké.
// -----------------------------------------------------------------------------

export interface Recolte {
  id: string;
  ressource: string;
  quantite: number;
  recolteLe: number;
  parQui: string | null;
  note: string | null;
}

interface LigneRecolte {
  id: string;
  ressource: string;
  quantite: number;
  recolte_le: string;
  note: string | null;
  profils: { pseudo: string } | null;
}

/** Les ressources qu'on peut déclarer. Œufs mis à part, elles viennent des plantes. */
export const RESSOURCES: string[] = [
  ...Array.from(new Set(PLANTES.map((p) => p.ressource))),
  "œufs",
];

export function useRecoltes() {
  const { ferme, role, wipe, charge: fermeChargee, connecte } = useFermeActive();
  const [recoltes, setRecoltes] = useState<Recolte[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const disponible = Boolean(wipe);
  const modifiable = disponible && peutEcrire(role);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipe) {
      setRecoltes([]);
      setCharge(true);
      return;
    }
    const { data, error } = await sb
      .from("recoltes")
      .select("id, ressource, quantite, recolte_le, note, profils:cree_par ( pseudo )")
      .eq("wipe_id", wipe.id)
      .order("recolte_le", { ascending: false });

    if (error) setErreur(error.message);
    else {
      setErreur(null);
      setRecoltes(
        ((data as unknown as LigneRecolte[]) ?? []).map((l) => ({
          id: l.id,
          ressource: l.ressource,
          quantite: l.quantite,
          recolteLe: new Date(l.recolte_le).getTime(),
          parQui: l.profils?.pseudo ?? null,
          note: l.note,
        }))
      );
    }
    setCharge(true);
  }, [wipe]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const enregistrer = useCallback(
    async (ressource: string, quantite: number, note?: string) => {
      const sb = supabase();
      if (!sb || !wipe || !modifiable || quantite <= 0) return;
      const { data: utilisateur } = await sb.auth.getUser();

      const { error } = await sb.from("recoltes").insert({
        wipe_id: wipe.id,
        cree_par: utilisateur.user?.id ?? null,
        ressource,
        quantite,
        note: note?.trim() || null,
      });
      if (error) {
        setErreur(error.message);
        return;
      }
      await journaliser(wipe.id, "recolte_enregistree", { ressource, nombre: quantite });
      await recharger();
    },
    [wipe, modifiable, recharger]
  );

  const supprimer = useCallback(
    async (id: string) => {
      const sb = supabase();
      if (!sb || !modifiable) return;
      const { error } = await sb.from("recoltes").delete().eq("id", id);
      if (error) setErreur(error.message);
      await recharger();
    },
    [modifiable, recharger]
  );

  return {
    recoltes,
    ferme,
    wipe,
    disponible,
    modifiable,
    connecte,
    charge: charge && fermeChargee,
    erreur,
    enregistrer,
    supprimer,
    recharger,
  };
}

// -----------------------------------------------------------------------------
// Statistiques
// -----------------------------------------------------------------------------

export interface StatRessource {
  ressource: string;
  total: number;
  nombre: number;
  meilleure: number;
  moyenne: number;
  /** Production estimée cumulée depuis le début du wipe. */
  attendu: number;
  /** Réel divisé par attendu. Null quand rien n'est estimé. */
  efficacite: number | null;
}

export function useStatistiques(recoltes: Recolte[], debutWipe: number | null) {
  const { plantations } = usePlantations();
  const production = useProductionEstimee(plantations);

  return useMemo(() => {
    const heures = debutWipe ? Math.max(0, (Date.now() - debutWipe) / 3_600_000) : 0;
    const attenduPar = new Map<string, number>(
      production.map((p: LigneProduction) => [p.ressource, p.parHeure * heures])
    );

    const par = new Map<string, StatRessource>();
    for (const r of recoltes) {
      const s = par.get(r.ressource) ?? {
        ressource: r.ressource,
        total: 0,
        nombre: 0,
        meilleure: 0,
        moyenne: 0,
        attendu: 0,
        efficacite: null,
      };
      s.total += r.quantite;
      s.nombre += 1;
      s.meilleure = Math.max(s.meilleure, r.quantite);
      par.set(r.ressource, s);
    }

    for (const s of par.values()) {
      s.moyenne = s.nombre > 0 ? s.total / s.nombre : 0;
      s.attendu = attenduPar.get(s.ressource) ?? 0;
      s.efficacite = s.attendu > 0 ? s.total / s.attendu : null;
    }

    return {
      parRessource: [...par.values()].sort((a, b) => b.total - a.total),
      nombreRecoltes: recoltes.length,
      heuresWipe: heures,
    };
  }, [recoltes, debutWipe, production]);
}

// -----------------------------------------------------------------------------
// Plausibilité
//
// Une récolte est saisie à la main : rien n'empêche d'y mettre n'importe quoi.
// Des statistiques bâties sur des chiffres invérifiables ne valent rien, et un
// classement encore moins.
//
// On confronte donc la saisie à la capacité théorique de la ferme déclarée
// depuis la dernière récolte de cette ressource. On avertit sans bloquer :
// refuser une récolte légitime serait pire que d'en accepter une douteuse.
//
// Limite assumée : la configuration n'est pas historisée. Quelqu'un qui monte
// vingt bacs aujourd'hui verra sa capacité d'hier recalculée à la hausse.
// -----------------------------------------------------------------------------

/** Marge laissée au-dessus du théorique : thés, conditions, bacs non déclarés. */
const MARGE = 2;

export interface Plausibilite {
  verdict: "coherent" | "eleve" | "impossible" | "inconnu";
  plafond: number | null;
  message: string | null;
}

export function evaluerPlausibilite(
  ressource: string,
  quantite: number,
  recoltes: Recolte[],
  production: LigneProduction[],
  debutWipe: number | null
): Plausibilite {
  const ligne = production.find((p) => p.ressource === ressource);
  if (!ligne || ligne.parHeure <= 0) {
    return {
      verdict: "inconnu",
      plafond: null,
      message:
        "Aucune plantation déclarée pour cette ressource : impossible de vérifier ce chiffre. Déclare tes bacs pour que les statistiques aient un sens.",
    };
  }

  const derniere = recoltes
    .filter((r) => r.ressource === ressource)
    .reduce<number | null>((a, r) => (a === null || r.recolteLe > a ? r.recolteLe : a), null);

  const depuis = derniere ?? debutWipe ?? Date.now();
  const heures = Math.max(0.05, (Date.now() - depuis) / 3_600_000);
  const plafond = ligne.parHeure * heures * MARGE;

  if (quantite <= plafond) return { verdict: "coherent", plafond, message: null };

  if (quantite <= plafond * 3) {
    return {
      verdict: "eleve",
      plafond,
      message: `C'est au-dessus de ce que ta ferme peut produire en ${heures < 1 ? "moins d'une heure" : `${Math.round(heures)} h`} (environ ${Math.round(plafond)}). Possible si tu as des bacs non déclarés ou un stock accumulé — sinon, vérifie le chiffre.`,
    };
  }

  return {
    verdict: "impossible",
    plafond,
    message: `Ta ferme ne peut pas avoir produit ça : le maximum théorique sur la période est d'environ ${Math.round(plafond)}. La récolte sera enregistrée, mais elle faussera tes statistiques.`,
  };
}
