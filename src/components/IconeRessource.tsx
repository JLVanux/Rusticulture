"use client";

import { PLANTES, type PlanteId } from "@/data/game";
import { IconeObjet, IconePlante } from "@/components/IconePlante";

/**
 * Icône d'une ressource récoltée, désignée par son nom plutôt que par une
 * plante — c'est ainsi que les récoltes et la production les nomment.
 *
 * Plusieurs plantes partagent une ressource : les cinq baies donnent toutes
 * des « baies ». On prend la première qui correspond, ce qui suffit à donner
 * un repère visuel sans prétendre désigner une variété précise.
 */
const PAR_RESSOURCE = new Map<string, PlanteId>();
for (const p of PLANTES) {
  if (!PAR_RESSOURCE.has(p.ressource)) PAR_RESSOURCE.set(p.ressource, p.id);
}

export function IconeRessource({
  ressource,
  taille = 20,
  className = "",
}: {
  ressource: string;
  taille?: number;
  className?: string;
}) {
  // Les œufs ne viennent d'aucune plante : ils ont leur propre fichier.
  if (ressource === "œufs" || ressource === "oeufs") {
    return <IconeObjet fichier="oeuf" nom="Œuf" taille={taille} className={className} />;
  }

  const plante = PAR_RESSOURCE.get(ressource);
  if (!plante) return null;
  return <IconePlante plante={plante} taille={taille} className={className} />;
}
