"use client";

import { useMemo } from "react";
import type { GraineUnifiee } from "@/lib/graines";
import type { Recolte } from "@/lib/recoltes";
import type { Plantation } from "@/lib/plantations";
import type { Genome } from "@/data/game";

// -----------------------------------------------------------------------------
// Badges
//
// Tous personnels, tous dérivés des faits enregistrés. Aucun ne dépend des
// autres joueurs : « Top 10 » viendra avec le classement, quand il y aura des
// fermes à classer.
//
// Volontairement peu nombreux et lents à obtenir. Un badge distribué pour
// chaque geste ne récompense rien et transforme le site en machine à jetons —
// c'est exactement ce que le cahier des charges demandait d'éviter.
// -----------------------------------------------------------------------------

export interface Badge {
  id: string;
  nom: string;
  description: string;
  obtenu: boolean;
  /** 0 à 1, pour ceux qui ont une progression lisible. */
  progression: number;
  detail: string;
}

export interface ContexteBadges {
  recoltes: Recolte[];
  graines: GraineUnifiee[];
  plantations: Plantation[];
  nombreWipes: number;
}

/** Une série est « parfaite » si elle ne contient aucun gène rouge. */
function sansRouge(g: Genome): boolean {
  return !g.some((l) => l === "W" || l === "X");
}

function totalDe(recoltes: Recolte[], ressource: string): number {
  return recoltes.filter((r) => r.ressource === ressource).reduce((a, r) => a + r.quantite, 0);
}

export function useBadges(c: ContexteBadges): Badge[] {
  return useMemo(() => {
    const tissu = totalDe(c.recoltes, "tissu");
    const baies = totalDe(c.recoltes, "baies");
    const oeufs = totalDe(c.recoltes, "œufs");

    const parfaites = c.graines.filter((g) => sansRouge(g.genome));
    const gggyyy = c.graines.some((g) => g.genome.join("") === "GGGYYY");
    const contenants = c.plantations.reduce((a, p) => a + p.quantite, 0);

    const seuil = (nom: string, description: string, fait: number, cible: number, unite: string): Badge => ({
      id: nom.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      nom,
      description,
      obtenu: fait >= cible,
      progression: Math.min(1, cible > 0 ? fait / cible : 0),
      detail: `${Math.round(Math.min(fait, cible)).toLocaleString("fr-FR")} / ${cible.toLocaleString("fr-FR")} ${unite}`,
    });

    return [
      {
        id: "premiere-recolte",
        nom: "Première récolte",
        description: "Enregistrer une récolte réelle. C'est ce qui donne un sens à toutes les statistiques.",
        obtenu: c.recoltes.length > 0,
        progression: c.recoltes.length > 0 ? 1 : 0,
        detail: c.recoltes.length > 0 ? "fait" : "aucune récolte",
      },
      {
        id: "genes-propres",
        nom: "Graine propre",
        description: "Obtenir une graine sans aucun gène rouge — ni W, ni X.",
        obtenu: parfaites.length > 0,
        progression: parfaites.length > 0 ? 1 : 0,
        detail: parfaites.length > 0 ? `${parfaites.length} en réserve` : "aucune",
      },
      {
        id: "gggyyy",
        nom: "God clone",
        description: "Obtenir exactement GGGYYY, le compromis de référence.",
        obtenu: gggyyy,
        progression: gggyyy ? 1 : parfaites.length > 0 ? 0.5 : 0,
        detail: gggyyy ? "obtenu" : "pas encore",
      },
      seuil("Tisserand", "Produire 10 000 tissus sur un wipe.", tissu, 10_000, "tissus"),
      seuil("Filature", "Produire 100 000 tissus sur un wipe.", tissu, 100_000, "tissus"),
      seuil("Cueilleur", "Récolter 5 000 baies — de quoi tenir en thés.", baies, 5_000, "baies"),
      seuil("Basse-cour", "Récolter 2 000 œufs.", oeufs, 2_000, "œufs"),
      seuil("Exploitation", "Déclarer 20 contenants sur une même ferme.", contenants, 20, "contenants"),
      {
        id: "habitue",
        nom: "Habitué",
        description: "Traverser trois wipes avec la même ferme.",
        obtenu: c.nombreWipes >= 3,
        progression: Math.min(1, c.nombreWipes / 3),
        detail: `${c.nombreWipes} / 3 wipes`,
      },
    ];
  }, [c.recoltes, c.graines, c.plantations, c.nombreWipes]);
}
