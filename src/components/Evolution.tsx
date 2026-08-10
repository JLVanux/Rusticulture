"use client";

import { useState } from "react";
import { Choix } from "@/components/Ui";
import { formatNombre } from "@/lib/model";
import { comparerSemaines, useEvolution } from "@/lib/evolution";
import type { Recolte } from "@/lib/recoltes";

/**
 * Production par jour de wipe.
 *
 * Dessiné à la main en SVG plutôt qu'avec une bibliothèque de graphiques : ce
 * sont des barres et une courbe, et une dépendance de cent kilo-octets pour ça
 * se paierait au chargement de chaque page.
 *
 * Un tableau reste lisible par les lecteurs d'écran sous le graphique : une
 * image de données sans équivalent textuel n'est pas consultable.
 */
// Le SVG ne peut pas lire les jetons Tailwind : les deux couleurs du graphique
// sont donc reprises ici. À tenir en accord avec `lampe.DEFAULT` et `gene.g`.
const COULEUR_BARRE = "#d9482c";
const COULEUR_CUMUL = "#5fd39a";

export function EvolutionRecoltes({
  recoltes,
  debutWipe,
  ressources,
}: {
  recoltes: Recolte[];
  debutWipe: number | null;
  ressources: string[];
}) {
  const [ressource, setRessource] = useState(ressources[0] ?? null);
  const { jours, maximum, total } = useEvolution(recoltes, debutWipe, ressource);
  const semaines = comparerSemaines(jours);

  if (!debutWipe || ressources.length === 0 || jours.length === 0) return null;

  const largeur = 720;
  const hauteur = 180;
  const margeBas = 22;
  const zone = hauteur - margeBas;
  const pas = largeur / jours.length;
  const largeurBarre = Math.max(2, Math.min(28, pas * 0.7));

  const echelle = (v: number) => (maximum > 0 ? (v / maximum) * (zone - 8) : 0);

  // Courbe du cumul, ramenée à la même hauteur pour être lisible par-dessus.
  const cumulMax = jours[jours.length - 1]?.cumul ?? 0;
  const courbe = jours
    .map((j, i) => {
      const x = i * pas + pas / 2;
      const y = zone - (cumulMax > 0 ? (j.cumul / cumulMax) * (zone - 8) : 0);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const moyenne = jours.length > 0 ? total / jours.length : 0;
  const yMoyenne = zone - echelle(moyenne);

  return (
    <section className="mt-10">
      <h2 className="titre text-xl">Évolution</h2>
      <p className="mt-1 text-[14px] text-feuille-400">
        Production par jour de wipe. Les barres sont les récoltes du jour, la courbe le cumul.
      </p>

      {ressources.length > 1 && (
        <div className="mt-3">
          <Choix
            valeur={ressource ?? ressources[0]}
            onChange={setRessource}
            options={ressources.map((r) => ({ label: r, valeur: r }))}
          />
        </div>
      )}

      <div className="mt-4 verre rampe p-4">
        <svg
          viewBox={`0 0 ${largeur} ${hauteur}`}
          className="w-full"
          role="img"
          aria-label={`Production de ${ressource} par jour, du jour 1 au jour ${jours.length}`}
        >
          {/* Repère de la moyenne quotidienne */}
          {maximum > 0 && (
            <>
              <line
                x1="0"
                y1={yMoyenne}
                x2={largeur}
                y2={yMoyenne}
                stroke="#3a332e"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x="4" y={yMoyenne - 4} fill="#9b918a" fontSize="11" fontFamily="monospace">
                moyenne {formatNombre(moyenne, 0)}
              </text>
            </>
          )}

          {jours.map((j, i) => {
            const h = echelle(j.total);
            return (
              <rect
                key={j.jour}
                x={i * pas + (pas - largeurBarre) / 2}
                y={zone - h}
                width={largeurBarre}
                height={Math.max(h, j.total > 0 ? 2 : 0)}
                rx="2"
                fill={j.total > 0 ? COULEUR_BARRE : "transparent"}
              >
                <title>{`Jour ${j.jour} — ${formatNombre(j.total, 0)} ${ressource}`}</title>
              </rect>
            );
          })}

          {cumulMax > 0 && (
            <path d={courbe} fill="none" stroke={COULEUR_CUMUL} strokeWidth="2" strokeLinejoin="round" />
          )}

          <line x1="0" y1={zone} x2={largeur} y2={zone} stroke="#25211d" strokeWidth="1" />

          {jours
            .filter((_, i) => i === 0 || i === jours.length - 1 || (i + 1) % 7 === 0)
            .map((j) => {
              const i = j.jour - 1;
              return (
                <text
                  key={j.jour}
                  x={i * pas + pas / 2}
                  y={hauteur - 6}
                  fill="#9b918a"
                  fontSize="11"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  j{j.jour}
                </text>
              );
            })}
        </svg>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/[0.07] pt-3 font-mono text-[12px] text-feuille-400">
          <span>
            <span className="text-lampe-chaud">▇</span> par jour
          </span>
          <span>
            <span className="text-gene-g">—</span> cumul : {formatNombre(total, 0)}
          </span>
          <span>meilleur jour : {formatNombre(maximum, 0)}</span>
        </div>
      </div>

      {semaines && (
        <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
          Ces sept derniers jours : {formatNombre(semaines.recents, 0)} {ressource}, contre{" "}
          {formatNombre(semaines.precedents, 0)} la semaine précédente —{" "}
          <span className={semaines.variation >= 0 ? "text-gene-g" : "text-gene-w"}>
            {semaines.variation >= 0 ? "+" : ""}
            {Math.round(semaines.variation * 100)} %
          </span>
          .
        </p>
      )}

      {/* Équivalent textuel : un graphique seul n'est pas consultable au lecteur d'écran. */}
      <details className="mt-3">
        <summary className="cursor-pointer font-mono text-[12px] uppercase tracking-wider text-feuille-400 hover:text-feuille-200">
          Voir les chiffres
        </summary>
        {/* Comme les autres tableaux : il défile plutôt que de déborder. */}
        <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[16rem] text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-1.5 font-mono text-[11px] uppercase tracking-wider text-feuille-400">Jour</th>
              <th className="pb-1.5 font-mono text-[11px] uppercase tracking-wider text-feuille-400">Récolté</th>
              <th className="pb-1.5 font-mono text-[11px] uppercase tracking-wider text-feuille-400">Cumul</th>
            </tr>
          </thead>
          <tbody>
            {jours
              .filter((j) => j.total > 0)
              .reverse()
              .map((j) => (
                <tr key={j.jour} className="border-b border-white/[0.07]">
                  <td className="py-1.5 font-mono text-feuille-400">j{j.jour}</td>
                  <td className="font-mono text-feuille-100">{formatNombre(j.total, 0)}</td>
                  <td className="font-mono text-feuille-400">{formatNombre(j.cumul, 0)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        </div>
      </details>
    </section>
  );
}
