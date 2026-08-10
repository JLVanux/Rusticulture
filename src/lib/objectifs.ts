"use client";

import { useCallback, useEffect, useState } from "react";
import { PLANTE_PAR_ID, type Genome } from "@/data/game";
import { formatGenome, parseGenome } from "@/lib/crossbreed";
import { peutEcrire } from "@/lib/compte";
import { journaliser, useFermeActive, type GraineUnifiee } from "@/lib/graines";
import { CONTENANT_PAR_ID, type Plantation } from "@/lib/plantations";
import type { Recolte } from "@/lib/recoltes";
import { supabase } from "@/lib/supabase";

// -----------------------------------------------------------------------------
// Objectifs
//
// La progression n'est jamais stockée : elle se recalcule à partir des récoltes,
// des graines et des plantations. Un compteur figé en base finirait par mentir,
// par exemple après la suppression d'une récolte saisie par erreur.
//
// Seul le type « libre » a un état propre, puisque rien dans les données ne
// permet de savoir s'il est atteint.
// -----------------------------------------------------------------------------

export type TypeObjectif = "production" | "genetique" | "construction" | "libre";

export interface Objectif {
  id: string;
  libelle: string;
  type: TypeObjectif;
  ressource: string | null;
  cible: number | null;
  genes: Genome | null;
  atteintLe: string | null;
}

interface LigneObjectif {
  id: string;
  libelle: string;
  type: string;
  ressource: string | null;
  cible: number | null;
  genes: string | null;
  atteint_le: string | null;
}

export function useObjectifs() {
  const { role, wipe, charge: fermeChargee } = useFermeActive();
  const [objectifs, setObjectifs] = useState<Objectif[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const modifiable = Boolean(wipe) && peutEcrire(role);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipe) {
      setObjectifs([]);
      setCharge(true);
      return;
    }
    const { data, error } = await sb
      .from("objectifs")
      .select("id, libelle, type, ressource, cible, genes, atteint_le")
      .eq("wipe_id", wipe.id)
      .order("cree_le", { ascending: true });

    if (error) setErreur(error.message);
    else {
      setErreur(null);
      setObjectifs(
        ((data as LigneObjectif[]) ?? []).map((l) => ({
          id: l.id,
          libelle: l.libelle,
          type: l.type as TypeObjectif,
          ressource: l.ressource,
          cible: l.cible === null ? null : Number(l.cible),
          genes: l.genes ? parseGenome(l.genes) : null,
          atteintLe: l.atteint_le,
        }))
      );
    }
    setCharge(true);
  }, [wipe]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const ajouter = useCallback(
    async (o: Omit<Objectif, "id" | "atteintLe">) => {
      const sb = supabase();
      if (!sb || !wipe || !modifiable) return;
      const { error } = await sb.from("objectifs").insert({
        wipe_id: wipe.id,
        libelle: o.libelle,
        type: o.type,
        ressource: o.ressource,
        cible: o.cible,
        genes: o.genes ? formatGenome(o.genes) : null,
      });
      if (error) setErreur(error.message);
      else {
        await journaliser(wipe.id, "objectif_ajoute", { nom: o.libelle });
        await recharger();
      }
    },
    [wipe, modifiable, recharger]
  );

  const supprimer = useCallback(
    async (id: string) => {
      const sb = supabase();
      if (!sb || !modifiable) return;
      const { error } = await sb.from("objectifs").delete().eq("id", id);
      if (error) setErreur(error.message);
      await recharger();
    },
    [modifiable, recharger]
  );

  const basculerLibre = useCallback(
    async (id: string, atteint: boolean) => {
      const sb = supabase();
      if (!sb || !modifiable) return;
      const { error } = await sb
        .from("objectifs")
        .update({ atteint_le: atteint ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) setErreur(error.message);
      await recharger();
    },
    [modifiable, recharger]
  );

  return { objectifs, modifiable, charge: charge && fermeChargee, erreur, ajouter, supprimer, basculerLibre, recharger };
}

// -----------------------------------------------------------------------------
// Progression
// -----------------------------------------------------------------------------

export interface Progression {
  /** 0 à 1. */
  part: number;
  /** Ce qui est fait, dans l'unité de l'objectif. */
  fait: number;
  cible: number;
  detail: string;
  atteint: boolean;
}

export function calculerProgression(
  o: Objectif,
  contexte: { recoltes: Recolte[]; graines: GraineUnifiee[]; plantations: Plantation[] }
): Progression {
  switch (o.type) {
    case "production": {
      const cible = o.cible ?? 0;
      const fait = contexte.recoltes
        .filter((r) => r.ressource === o.ressource)
        .reduce((a, r) => a + r.quantite, 0);
      return {
        part: cible > 0 ? Math.min(1, fait / cible) : 0,
        fait,
        cible,
        detail: `${Math.round(fait)} / ${Math.round(cible)} ${o.ressource ?? ""}`,
        atteint: cible > 0 && fait >= cible,
      };
    }

    case "genetique": {
      const vise = o.genes;
      if (!vise) return { part: 0, fait: 0, cible: 6, detail: "—", atteint: false };

      // La meilleure graine en réserve, mesurée en cases déjà justes.
      let meilleur = 0;
      for (const g of contexte.graines) {
        const justes = g.genome.reduce((a, l, i) => a + (l === vise[i] ? 1 : 0), 0);
        if (justes > meilleur) meilleur = justes;
      }
      return {
        part: meilleur / 6,
        fait: meilleur,
        cible: 6,
        detail: `${meilleur} / 6 cases sur ta meilleure graine`,
        atteint: meilleur === 6,
      };
    }

    case "construction": {
      const cible = o.cible ?? 0;
      const fait = contexte.plantations
        .filter((p) => !o.ressource || p.contenant === o.ressource)
        .reduce((a, p) => a + p.quantite, 0);
      const nom = o.ressource
        ? (CONTENANT_PAR_ID[o.ressource as keyof typeof CONTENANT_PAR_ID]?.nom ?? "contenants").toLowerCase()
        : "contenants";
      return {
        part: cible > 0 ? Math.min(1, fait / cible) : 0,
        fait,
        cible,
        detail: `${fait} / ${Math.round(cible)} ${nom}`,
        atteint: cible > 0 && fait >= cible,
      };
    }

    case "libre":
    default:
      return {
        part: o.atteintLe ? 1 : 0,
        fait: o.atteintLe ? 1 : 0,
        cible: 1,
        detail: o.atteintLe ? "fait" : "à faire",
        atteint: Boolean(o.atteintLe),
      };
  }
}

/** Suggestions d'objectifs, formulées comme un joueur les dirait. */
export const MODELES: {
  libelle: string;
  type: TypeObjectif;
  ressource?: string;
  cible?: number;
  genes?: string;
}[] = [
  { libelle: "Produire 10 000 tissus", type: "production", ressource: "tissu", cible: 10000 },
  { libelle: "Produire 50 000 tissus", type: "production", ressource: "tissu", cible: 50000 },
  { libelle: "Obtenir des gènes parfaits", type: "genetique", genes: "GGGYYY" },
  { libelle: "Obtenir le rendement maximum", type: "genetique", genes: "YYYYYY" },
  { libelle: "Monter 8 grands bacs", type: "construction", ressource: "grand_bac", cible: 8 },
  { libelle: "Récolter 5 000 baies", type: "production", ressource: "baies", cible: 5000 },
];

