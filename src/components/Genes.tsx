"use client";

import { GENES, GENE_LETTERS, type GeneLetter, type Genome } from "@/data/game";
import type { Distribution } from "@/lib/crossbreed";

const TAILLES = {
  sm: "h-6 w-6 text-[12px]",
  md: "h-9 w-9 text-[15px]",
  lg: "h-12 w-12 text-[19px]",
};

/** Une chaîne de gènes en lecture seule. */
export function ChaineGenes({
  genome,
  taille = "md",
}: {
  genome: Genome;
  taille?: keyof typeof TAILLES;
}) {
  return (
    <span className="inline-flex gap-[3px]" aria-label={`Gènes ${genome.join("")}`}>
      {genome.map((lettre, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center rounded-sm font-mono font-bold ${TAILLES[taille]}`}
          style={{
            color: GENES[lettre].couleur,
            background: `${GENES[lettre].couleur}1a`,
            boxShadow: `inset 0 0 0 1px ${GENES[lettre].couleur}55`,
          }}
        >
          {lettre}
        </span>
      ))}
    </span>
  );
}

/**
 * Éditeur de chaîne. Chaque case se clique pour passer au gène suivant
 * (G → Y → H → W → X), ou se tape directement au clavier.
 */
export function EditeurGenes({
  genome,
  onChange,
  taille = "lg",
}: {
  genome: Genome;
  onChange: (g: Genome) => void;
  taille?: keyof typeof TAILLES;
}) {
  function definir(index: number, lettre: GeneLetter) {
    const suivant = [...genome];
    suivant[index] = lettre;
    onChange(suivant);
  }

  function suivante(lettre: GeneLetter): GeneLetter {
    const i = GENE_LETTERS.indexOf(lettre);
    return GENE_LETTERS[(i + 1) % GENE_LETTERS.length];
  }

  return (
    <div className="inline-flex gap-1">
      {genome.map((lettre, i) => (
        <button
          key={i}
          type="button"
          onClick={() => definir(i, suivante(lettre))}
          onKeyDown={(e) => {
            const l = e.key.toUpperCase() as GeneLetter;
            if (GENE_LETTERS.includes(l)) {
              e.preventDefault();
              definir(i, l);
            }
          }}
          aria-label={`Case ${i + 1} : ${GENES[lettre].nom}. Cliquer pour changer.`}
          className={`inline-flex items-center justify-center rounded font-mono font-bold transition hover:brightness-125 ${TAILLES[taille]}`}
          style={{
            color: GENES[lettre].couleur,
            background: `${GENES[lettre].couleur}1f`,
            boxShadow: `inset 0 0 0 1px ${GENES[lettre].couleur}66`,
          }}
        >
          {lettre}
        </button>
      ))}
    </div>
  );
}

/** Barre de probabilité par gène pour une case donnée. */
export function BarreDistribution({ dist }: { dist: Distribution }) {
  const entrees = GENE_LETTERS.map((l) => [l, dist[l] ?? 0] as const).filter(([, p]) => p > 0.0001);
  return (
    <div className="w-full">
      <div className="flex h-2 w-full overflow-hidden rounded-sm bg-soil-700">
        {entrees.map(([l, p]) => (
          <span
            key={l}
            style={{ width: `${p * 100}%`, background: GENES[l].couleur }}
            title={`${l} · ${Math.round(p * 100)} %`}
          />
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2 font-mono text-[10px] text-moss-400">
        {entrees.map(([l, p]) => (
          <span key={l} style={{ color: GENES[l].couleur }}>
            {l} {Math.round(p * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

/** Légende des cinq gènes. */
export function LegendeGenes() {
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {GENE_LETTERS.map((l) => (
        <div key={l} className="rounded border border-soil-600 bg-soil-850 p-3">
          <dt className="flex items-baseline gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm font-mono text-base font-bold"
              style={{
                color: GENES[l].couleur,
                background: `${GENES[l].couleur}1a`,
                boxShadow: `inset 0 0 0 1px ${GENES[l].couleur}55`,
              }}
            >
              {l}
            </span>
            <span className="font-display font-semibold uppercase tracking-wide text-moss-100">
              {GENES[l].nom}
            </span>
          </dt>
          <dd className="mt-1.5 text-[13px] leading-snug text-moss-400">
            {GENES[l].effet}
            <span className="mt-1 block font-mono text-[11px] text-moss-400">poids {GENES[l].poids.toFixed(1)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
