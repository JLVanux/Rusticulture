"use client";

import { useMemo } from "react";
import type { Recolte } from "@/lib/recoltes";

// -----------------------------------------------------------------------------
// Évolution
//
// Les récoltes sont horodatées : tout est là pour tracer une progression sans
// rien stocker de plus. Les agrégats se recalculent, comme le reste.
//
// Les jours sont comptés en jours de wipe, pas en dates : « jour 4 » parle plus
// à un joueur que « 12 août », et les trous restent visibles — un jour sans
// récolte est un jour à zéro, pas un jour absent.
// -----------------------------------------------------------------------------

export interface JourDeWipe {
  jour: number;
  date: Date;
  total: number;
  cumul: number;
}

const JOUR_MS = 86_400_000;

export function useEvolution(recoltes: Recolte[], debutWipe: number | null, ressource: string | null) {
  return useMemo(() => {
    if (!debutWipe || !ressource) return { jours: [] as JourDeWipe[], maximum: 0, total: 0 };

    // Alignement sur minuit : les journées suivent le calendrier, pas l'heure de
    // création du wipe. En pratique `wipes.debut` est une date et vaut déjà
    // minuit — c'est une sécurité si la valeur venait un jour d'ailleurs.
    const origine = new Date(debutWipe);
    origine.setHours(0, 0, 0, 0);
    const debut = origine.getTime();

    const dernierJour = Math.max(0, Math.floor((Date.now() - debut) / JOUR_MS));
    const parJour = new Array(dernierJour + 1).fill(0) as number[];

    for (const r of recoltes) {
      if (r.ressource !== ressource) continue;
      const index = Math.floor((r.recolteLe - debut) / JOUR_MS);
      if (index < 0 || index >= parJour.length) continue;
      parJour[index] += r.quantite;
    }

    let cumul = 0;
    const jours: JourDeWipe[] = parJour.map((total, i) => {
      cumul += total;
      return { jour: i + 1, date: new Date(debut + i * JOUR_MS), total, cumul };
    });

    return {
      jours,
      maximum: Math.max(0, ...parJour),
      total: cumul,
    };
  }, [recoltes, debutWipe, ressource]);
}

/**
 * Sept derniers jours contre les sept précédents.
 *
 * C'est la seule comparaison honnête tant qu'il n'y a pas d'autres fermes : se
 * comparer à soi-même. Elle demande au moins huit jours de wipe, sinon la
 * période de référence est vide et le pourcentage n'a aucun sens.
 */
export function comparerSemaines(jours: JourDeWipe[]) {
  if (jours.length < 8) return null;

  const recents = jours.slice(-7).reduce((a, j) => a + j.total, 0);
  const precedents = jours.slice(-14, -7).reduce((a, j) => a + j.total, 0);
  if (precedents === 0) return null;

  return { recents, precedents, variation: recents / precedents - 1 };
}
