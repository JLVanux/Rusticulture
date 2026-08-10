"use client";

import { useEffect, useRef, useState } from "react";

const MESSAGES = [
  {
    heure: "13:05",
    titre: "Bac 3 — va voir ton chanvre, le croisement est fait.",
    corps:
      "Inspecte le plant en jeu pour découvrir ses nouveaux gènes. S'ils te plaisent, bouture-le : la bouture les copie à l'identique.",
    pied: "GGGYYY · planté par Vanux",
  },
  {
    heure: "14:47",
    titre: "Salle du fond — ta baie bleue est prête à récolter.",
    corps: "C'est le rendement maximum. Passe la ramasser : ensuite le plant dépérit.",
    pied: "GGYYYY · planté par Alex",
  },
];

/**
 * Les messages arrivent l'un après l'autre quand la section entre à l'écran.
 *
 * Un aperçu figé se lit comme une capture d'écran ; les voir tomber donne
 * l'impression du service qui fonctionne. C'est le même geste que dans un vrai
 * salon, et ça ne coûte qu'une opacité.
 */
export function MessagesDiscord({ immediat = false }: { immediat?: boolean } = {}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [affiches, setAffiches] = useState(0);

  useEffect(() => {
    const sobre = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sobre || !cadre.current) {
      setAffiches(MESSAGES.length);
      return;
    }

    // Dans le hero, la section est déjà visible au chargement : attendre une
    // entrée dans l'écran ne déclencherait jamais rien.
    if (immediat) {
      const t = MESSAGES.map((_, i) => setTimeout(() => setAffiches(i + 1), 400 + i * 900));
      return () => t.forEach(clearTimeout);
    }

    const minuteries: ReturnType<typeof setTimeout>[] = [];
    const observateur = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        observateur.disconnect();
        MESSAGES.forEach((_, i) => {
          minuteries.push(setTimeout(() => setAffiches(i + 1), 350 + i * 900));
        });
      },
      { threshold: 0.4 }
    );
    observateur.observe(cadre.current);

    return () => {
      observateur.disconnect();
      minuteries.forEach(clearTimeout);
    };
  }, [immediat]);

  return (
    <div ref={cadre} className="rounded-sm border border-trait bg-case-creuse p-4">
      <div className="flex items-center gap-2 border-b border-trait pb-2.5">
        <span className="fente h-6 w-6 font-mono text-[11px] text-braise">R</span>
        <span className="font-display text-[14px] font-bold text-craie">RustiCulture</span>
        <span className="eyebrow ml-auto">#ferme</span>
      </div>

      <div className="mt-4 space-y-5">
        {MESSAGES.map((m, i) => (
          <div
            key={m.heure}
            className={`transition-all duration-500 ease-out ${
              i < affiches ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold leading-snug text-craie">{m.titre}</span>
              <span className="eyebrow ml-auto shrink-0">{m.heure}</span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-cendre">{m.corps}</p>
            <p className="mt-1.5 font-mono text-[11px] text-poussiere">{m.pied}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
