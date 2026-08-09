"use client";

import Link from "next/link";
import { Details } from "@/components/Ui";
import type { Recommandation } from "@/lib/recommandations";

/**
 * Une action mise en avant, les suivantes en retrait.
 *
 * Une seule proposition finirait par répéter la même chose tous les jours ; une
 * liste complète redonnerait le problème qu'elle prétend résoudre, à savoir
 * décider quoi faire. L'action principale répond à « maintenant », les autres à
 * « et si j'ai le temps ».
 */
export function Recommandations({ recommandations }: { recommandations: Recommandation[] }) {
  if (recommandations.length === 0) {
    return (
      <section className="panneau">
        <div className="eyebrow">Que faire maintenant</div>
        <p className="mt-2 text-[15px] leading-relaxed text-feuille-200">
          Rien d&apos;urgent. Tes plants poussent, tes bacs sont configurés, aucune fenêtre ne se referme.
        </p>
        <p className="mt-2 text-[13px] text-feuille-400">
          C&apos;est le bon moment pour croiser une génération de plus, ou aller miner pendant que ça pousse.
        </p>
      </section>
    );
  }

  const [principale, ...autres] = recommandations;

  return (
    <section>
      <Carte reco={principale} principale />

      {autres.length > 0 && (
        <div className="mt-4">
          <Details titre={`Autres pistes (${autres.length})`}>
            <ul className="space-y-2">
              {autres.map((r) => (
                <li key={r.id}>
                  <Carte reco={r} />
                </li>
              ))}
            </ul>
          </Details>
        </div>
      )}
    </section>
  );
}

function Carte({ reco, principale }: { reco: Recommandation; principale?: boolean }) {
  const couleur =
    reco.ton === "alerte"
      ? { bordure: "border-mur/60", fond: "bg-mur/8", texte: "text-mur" }
      : reco.ton === "action"
        ? { bordure: "border-lampe", fond: "bg-lampe/10", texte: "text-lampe-chaud" }
        : { bordure: "border-white/10", fond: "bg-nuit-800", texte: "text-feuille-100" };

  return (
    <article className={`rounded-lg border ${couleur.bordure} ${couleur.fond} ${principale ? "p-5" : "p-4"}`}>
      {principale && <div className="eyebrow mb-2">Que faire maintenant</div>}

      <h3
        className={`font-display font-bold uppercase tracking-wide ${couleur.texte} ${
          principale ? "text-2xl leading-tight" : "text-base"
        }`}
      >
        {reco.titre}
      </h3>

      <p className={`mt-2 leading-relaxed text-feuille-200 ${principale ? "text-[15px]" : "text-[14px]"}`}>
        {reco.detail}
      </p>

      {/* Le fait déclencheur, toujours visible : sans lui, le site joue les
          oracles et on ne peut ni le contredire ni le corriger. */}
      <p className="mt-2 font-mono text-[12px] leading-relaxed text-feuille-400">{reco.pourquoi}</p>

      {reco.lien && (
        <Link href={reco.lien.href} className={`bouton mt-4 inline-flex ${principale ? "bouton-primaire" : ""}`}>
          {reco.lien.label}
        </Link>
      )}
    </article>
  );
}
