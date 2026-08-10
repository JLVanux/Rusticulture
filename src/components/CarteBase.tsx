"use client";

import { lienVideo, miniature, TAILLE_PAR_ID, type Base } from "@/lib/bases";

const DIFFICULTES = ["Très simple", "Simple", "Moyenne", "Exigeante", "Experte"];

export function CarteBase({ base, actions }: { base: Base; actions?: React.ReactNode }) {
  const contenu = [
    [base.grandsBacs, "grand bac", "grands bacs"],
    [base.petitsBacs, "petit bac", "petits bacs"],
    [base.pots, "pot", "pots"],
    [base.poulaillers, "poulailler", "poulaillers"],
  ] as const;

  const plants = base.grandsBacs * 9 + base.petitsBacs + base.pots;

  return (
    <article className="verre overflow-hidden">
      <a href={lienVideo(base.videoId)} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={miniature(base.videoId)}
          alt={base.titre}
          className="aspect-video w-full object-cover"
          loading="lazy"
        />
      </a>

      <div className="p-4">
        <h3 className="titre text-lg leading-tight">{base.titre}</h3>
        {base.auteurVideo && (
          <p className="mt-0.5 font-mono text-[12px] text-poussiere">{base.auteurVideo}</p>
        )}

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {contenu
            .filter(([n]) => n > 0)
            .map(([n, un, plusieurs]) => (
              <li key={un} className="puce text-cendre">
                {n} {n > 1 ? plusieurs : un}
              </li>
            ))}
          <li className="puce border-rouille/50 text-braise">
            {TAILLE_PAR_ID[base.taille]?.court ?? "—"}
          </li>
          <li className="puce text-cendre">{DIFFICULTES[base.difficulte - 1]}</li>
        </ul>

        {plants > 0 && (
          <p className="mt-3 text-[13px] text-poussiere">
            {plants} emplacements de culture au total.
          </p>
        )}

        {base.description && (
          <p className="mt-3 text-[13px] leading-relaxed text-cendre">{base.description}</p>
        )}

        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}
