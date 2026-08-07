"use client";

import { Curseur } from "@/components/Ui";
import { useConditions } from "@/lib/hooks";
import type { Conditions } from "@/lib/model";

function parfaites(c: Conditions) {
  return c.eau >= 0.999 && c.lumiere >= 0.999 && c.temperature >= 0.999;
}

/**
 * Les conditions de culture rallongent toutes les durées du site, minuteurs
 * compris. Tant qu'elles étaient repliées dans un coin de la page Rendement,
 * on pouvait les baisser et ne plus jamais s'en souvenir. Ce bandeau ne
 * s'affiche que lorsqu'elles ne sont pas au maximum — donc jamais, dans le cas
 * normal — et suit la personne sur toutes les pages concernées.
 */
export function AlerteConditions() {
  const [conditions, setConditions] = useConditions();
  if (parfaites(conditions)) return null;

  const manquants = [
    conditions.eau < 0.999 && `eau ${Math.round(conditions.eau * 100)} %`,
    conditions.lumiere < 0.999 && `lumière ${Math.round(conditions.lumiere * 100)} %`,
    conditions.temperature < 0.999 && `température ${Math.round(conditions.temperature * 100)} %`,
  ].filter(Boolean) as string[];

  return (
    <div className="mb-6 rounded border border-ripe/50 bg-ripe/8 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-display text-[14px] font-semibold uppercase tracking-wide text-ripe">
          Conditions dégradées
        </span>
        <span className="font-mono text-[12px] text-moss-200">{manquants.join(" · ")}</span>
        <button
          type="button"
          className="ml-auto font-mono text-[11px] uppercase tracking-wider text-moss-400 hover:text-lamp-glow"
          onClick={() => setConditions({ ...conditions, eau: 1, lumiere: 1, temperature: 1 })}
        >
          Tout remettre à 100 %
        </button>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-moss-200">
        Toutes les durées du site sont rallongées en conséquence, y compris tes minuteurs en cours.
      </p>
    </div>
  );
}

/** Les trois curseurs, à afficher en clair là où ils comptent. */
export function ReglageConditions() {
  const [conditions, setConditions] = useConditions();

  return (
    <div className="space-y-4">
      <Curseur label="Eau" valeur={conditions.eau} onChange={(v) => setConditions({ ...conditions, eau: v })} />
      <Curseur
        label="Lumière"
        valeur={conditions.lumiere}
        onChange={(v) => setConditions({ ...conditions, lumiere: v })}
      />
      <Curseur
        label="Température"
        valeur={conditions.temperature}
        onChange={(v) => setConditions({ ...conditions, temperature: v })}
      />
      <label className="flex items-center gap-2 text-[14px] text-moss-200">
        <input
          type="checkbox"
          checked={conditions.engrais}
          onChange={(e) => setConditions({ ...conditions, engrais: e.target.checked })}
          className="h-4 w-4 accent-lamp"
        />
        Engrais dans le bac
      </label>
      <p className="text-[13px] leading-relaxed text-moss-400">
        Un plafonnier par bac met la lumière à 100 % en continu, un arroseur fait pareil pour l&apos;eau, et un
        chauffage électrique pour la température en biome neige. Ces trois réglages allongent les durées
        partout sur le site.
      </p>
    </div>
  );
}
