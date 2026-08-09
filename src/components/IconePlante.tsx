"use client";

import { useState } from "react";
import { PLANTE_PAR_ID, type PlanteId } from "@/data/game";

export type EtatPlante = "graine" | "buisson" | "produit";

const DOSSIER: Record<EtatPlante, string> = {
  graine: "Graine",
  buisson: "Buisson",
  produit: "Baie",
};

/**
 * Icône d'une culture, dans l'un de ses trois états.
 *
 * Les images vivent dans `public/icons/<Dossier>/<fichier>.png` et ne sont pas
 * fournies avec le projet : ce sont des ressources de Facepunch.
 *
 * Deux extensions sont tentées, `.png` puis `.webp`, avant de retomber sur une
 * pastille colorée. Ce repli n'est pas une politesse : il permet d'ajouter les
 * icônes une par une sans qu'aucune page ne casse entre-temps, et il évite le
 * carré blanc de l'image manquante.
 */
export function IconePlante({
  plante,
  etat = "produit",
  taille = 24,
  className = "",
}: {
  plante: PlanteId;
  etat?: EtatPlante;
  taille?: number;
  className?: string;
}) {
  const [essai, setEssai] = useState(0);
  const infos = PLANTE_PAR_ID[plante];
  if (!infos) return null;

  const fichier = infos.etats[etat].fichier;
  const nom = infos.etats[etat].nom;
  const extensions = ["png", "webp"];

  if (essai >= extensions.length) {
    return (
      <span
        className={`inline-block shrink-0 rounded-full ${className}`}
        style={{
          width: taille,
          height: taille,
          background: `radial-gradient(circle at 32% 30%, ${infos.couleur}, ${infos.couleur}55)`,
          boxShadow: `0 0 ${taille / 2}px -${taille / 4}px ${infos.couleur}`,
        }}
        role="img"
        aria-label={nom}
      />
    );
  }

  return (
    // Balise <img> volontaire plutôt que next/image : ces fichiers sont fournis
    // par l'utilisateur, peuvent manquer, et l'optimisation de Next échouerait
    // bruyamment sur une image absente au lieu de laisser jouer le repli.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${DOSSIER[etat]}/${fichier}.${extensions[essai]}`}
      alt={nom}
      width={taille}
      height={taille}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: taille, height: taille }}
      onError={() => setEssai((n) => n + 1)}
      loading="lazy"
    />
  );
}

/** La chaîne complète : graine → buisson → produit. */
export function ChaineCulture({ plante, taille = 32 }: { plante: PlanteId; taille?: number }) {
  const infos = PLANTE_PAR_ID[plante];
  if (!infos) return null;

  const etapes: EtatPlante[] = ["graine", "buisson", "produit"];

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {etapes.map((etat, i) => (
        <li key={etat} className="flex items-center gap-2">
          <span className="flex flex-col items-center gap-1 text-center">
            <IconePlante plante={plante} etat={etat} taille={taille} />
            <span className="max-w-[7.5rem] text-[12px] leading-tight text-feuille-400">
              {infos.etats[etat].nom}
            </span>
          </span>
          {i < etapes.length - 1 && (
            <span className="self-start pt-2 font-mono text-feuille-600" aria-hidden>
              →
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
