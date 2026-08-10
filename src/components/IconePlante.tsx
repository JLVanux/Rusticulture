"use client";

import { useState } from "react";
import { PLANTES, PLANTE_PAR_ID, type PlanteId } from "@/data/game";

/**
 * Icône d'une culture, telle qu'elle apparaît en jeu.
 *
 * Les images vivent à plat dans `public/icons`, en `.jpg`, et ne sont pas
 * fournies avec le projet : ce sont des ressources de Facepunch.
 *
 * Le repli en pastille colorée n'est pas une politesse : il permet d'ajouter
 * les icônes une par une sans qu'aucune page ne casse, et il évite le carré
 * blanc de l'image manquante.
 */
export function IconePlante({
  plante,
  taille = 24,
  className = "",
}: {
  plante: PlanteId;
  taille?: number;
  className?: string;
}) {
  const [absente, setAbsente] = useState(false);
  const infos = PLANTE_PAR_ID[plante];
  if (!infos) return null;

  if (absente) {
    return (
      <span
        className={`inline-block shrink-0 rounded-sm ${className}`}
        style={{ width: taille, height: taille, background: infos.couleur }}
        role="img"
        aria-label={infos.nom}
      />
    );
  }

  return (
    // Balise <img> volontaire plutôt que next/image : ces fichiers sont fournis
    // par l'utilisateur et peuvent manquer. L'optimisation de Next échouerait
    // bruyamment sur une image absente au lieu de laisser jouer le repli.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${infos.icone}.jpg`}
      alt={infos.nom}
      width={taille}
      height={taille}
      className={`inline-block shrink-0 rounded-sm object-cover ${className}`}
      style={{ width: taille, height: taille }}
      onError={() => setAbsente(true)}
      loading="lazy"
    />
  );
}

/** Icône d'un objet quelconque : œuf, tarte, ressource. */
export function IconeObjet({
  fichier,
  nom,
  taille = 24,
  className = "",
}: {
  fichier: string;
  nom: string;
  taille?: number;
  className?: string;
}) {
  const [absente, setAbsente] = useState(false);
  if (absente) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${fichier}.jpg`}
      alt={nom}
      width={taille}
      height={taille}
      className={`inline-block shrink-0 rounded-sm object-cover ${className}`}
      style={{ width: taille, height: taille }}
      onError={() => setAbsente(true)}
      loading="lazy"
    />
  );
}

// -----------------------------------------------------------------------------
// Par ressource
// -----------------------------------------------------------------------------

/**
 * Plusieurs plantes partagent une ressource : les cinq baies donnent toutes des
 * « baies ». On prend la première qui correspond, ce qui suffit à donner un
 * repère visuel sans prétendre désigner une variété précise.
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
