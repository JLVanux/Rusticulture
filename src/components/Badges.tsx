"use client";

import { Details } from "@/components/Ui";
import { useBadges, type ContexteBadges } from "@/lib/badges";

export function SectionBadges(contexte: ContexteBadges) {
  const badges = useBadges(contexte);
  const obtenus = badges.filter((b) => b.obtenu);
  const restants = badges.filter((b) => !b.obtenu).sort((a, b) => b.progression - a.progression);

  return (
    <section className="mt-10">
      <h2 className="titre text-xl">
        Records{" "}
        <span className="font-mono text-sm font-normal text-moss-400">
          {obtenus.length} / {badges.length}
        </span>
      </h2>

      {obtenus.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {obtenus.map((b) => (
            <li
              key={b.id}
              className="rounded border border-gene-g/40 bg-gene-g/8 px-2.5 py-1.5"
              title={b.description}
            >
              <span className="font-display text-[14px] font-semibold uppercase tracking-wide text-gene-g">
                {b.nom}
              </span>
            </li>
          ))}
        </ul>
      )}

      {restants.length > 0 && (
        <div className="mt-4">
          <Details titre={`En cours (${restants.length})`}>
            <ul className="space-y-3">
              {restants.map((b) => (
                <li key={b.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-display text-[15px] font-semibold uppercase tracking-wide text-moss-200">
                      {b.nom}
                    </span>
                    <span className="font-mono text-[12px] text-moss-400">{b.detail}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-moss-400">{b.description}</p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-sm bg-soil-700">
                    <span
                      className="block h-full bg-lamp"
                      style={{ width: `${Math.max(1, b.progression * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Details>
        </div>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-moss-400">
        Volontairement peu nombreux et lents à obtenir. Un badge distribué à chaque geste ne récompense rien.
        Les classements viendront quand il y aura des fermes à comparer.
      </p>
    </section>
  );
}
