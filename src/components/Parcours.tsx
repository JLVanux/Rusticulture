"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/Reveal";
import type { ContexteParcours } from "@/data/parcours";
import { useParcours, type EtapeEtat } from "@/lib/parcours";

/**
 * Le parcours du wipe.
 *
 * Une fois la génétique fixée, le joueur n'a plus de raison de revenir : les
 * outils de croisement ont fait leur travail. Le parcours l'emmène vers la
 * suite — production, thés, élevage — en donnant à chaque moment une chose
 * précise à faire.
 *
 * La plupart des étapes se cochent seules à partir des données déjà là. Une
 * case à cocher n'apparaît que pour ce qui se passe en jeu et que le site ne
 * peut pas constater.
 */
export function SectionParcours({ contexte }: { contexte: ContexteParcours }) {
  const { phases, phaseCourante, prochaine, faites, total, modifiable, basculer } =
    useParcours(contexte);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const phaseAffichee = ouverte ?? phaseCourante?.id;

  return (
    <section className="mt-10">
      <div className="filet mb-3">
        <h2 className="titre text-xl">Parcours du wipe</h2>
        <span className="chiffre shrink-0 text-[13px] text-cendre">
          {faites} / {total}
        </span>
      </div>

      {/* La prochaine chose à faire, sortie du lot */}
      {prochaine && (
        <div className="verre border-l-2 border-l-rouille p-4">
          <div className="eyebrow">Prochaine étape</div>
          <h3 className="titre mt-1 text-lg leading-tight">{prochaine.titre}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-cendre">{prochaine.detail}</p>
          {prochaine.lien && (
            <Link href={prochaine.lien.href} className="bouton bouton-primaire mt-3 inline-flex">
              {prochaine.lien.label}
            </Link>
          )}
        </div>
      )}

      {/* Les phases */}
      <div className="mt-4 rangee">
        {phases.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOuverte(p.id)}
            className={`min-h-[2.5rem] rounded-sm border px-3.5 text-left font-display text-[13px] font-semibold transition ${
              phaseAffichee === p.id
                ? "border-rouille bg-rouille/15 text-braise"
                : "border-trait text-cendre hover:border-trait-vif hover:text-craie"
            }`}
          >
            {p.titre}
            <span className="ml-2 font-mono text-[11px] opacity-70">
              {p.faites}/{p.total}
            </span>
          </button>
        ))}
      </div>

      {phases
        .filter((p) => p.id === phaseAffichee)
        .map((p) => (
          <div key={p.id} className="mt-4">
            <p className="eyebrow mb-2">{p.sousTitre}</p>
            <ul className="grid gap-px overflow-hidden rounded-sm border border-trait bg-trait">
              {p.etapes.map((e, i) => (
                <Reveal key={e.etape.id} delai={i * 40} className="bg-case">
                  <Ligne etat={e} modifiable={modifiable} onBasculer={basculer} />
                </Reveal>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}

function Ligne({
  etat,
  modifiable,
  onBasculer,
}: {
  etat: EtapeEtat;
  modifiable: boolean;
  onBasculer: (id: string, fait: boolean) => void;
}) {
  const { etape, faite, automatique } = etat;

  return (
    <li className="flex items-start gap-3 p-3.5">
      {/* Une étape constatée par le site n'est pas décochable : ce serait
          contredire une donnée enregistrée. */}
      {automatique ? (
        <span className="fente mt-0.5 h-5 w-5 shrink-0 border-gene-g/50 text-gene-g" title="Constaté par le site">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M4 12.5 9.5 18 20 6.5" />
          </svg>
        </span>
      ) : (
        <input
          type="checkbox"
          checked={faite}
          disabled={!modifiable}
          onChange={(ev) => onBasculer(etape.id, ev.target.checked)}
          aria-label={etape.titre}
          className="mt-1 h-4 w-4 shrink-0 accent-rouille"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`font-display text-[15px] font-bold ${faite ? "text-cendre line-through" : "text-craie"}`}>
            {etape.titre}
          </span>
          {automatique && <span className="eyebrow text-gene-g">fait</span>}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-cendre">{etape.detail}</p>
        {etape.lien && !faite && (
          <Link
            href={etape.lien.href}
            className="mt-2 inline-block font-display text-[13px] font-semibold text-braise hover:underline"
          >
            {etape.lien.label} →
          </Link>
        )}
      </div>
    </li>
  );
}
