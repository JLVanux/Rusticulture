"use client";

import { GENES, type GeneLetter } from "@/data/game";
import type { ExplicationCase, StatutCase } from "@/lib/crossbreed";

const APPARENCE: Record<
  StatutCase,
  { bordure: string; fond: string; texte: string; etiquette: string }
> = {
  acquis: { bordure: "border-soil-600", fond: "bg-soil-850", texte: "text-moss-400", etiquette: "déjà bon" },
  gagne: { bordure: "border-gene-g/50", fond: "bg-gene-g/8", texte: "text-gene-g", etiquette: "corrigé" },
  egalite: { bordure: "border-ripe/50", fond: "bg-ripe/8", texte: "text-ripe", etiquette: "pile ou face" },
  perdu: { bordure: "border-gene-w/50", fond: "bg-gene-w/8", texte: "text-gene-w", etiquette: "échec" },
  menace: { bordure: "border-gene-w/50", fond: "bg-gene-w/8", texte: "text-gene-w", etiquette: "tu vas le perdre" },
};

function Lettre({ l, taille = "md" }: { l: GeneLetter; taille?: "sm" | "md" }) {
  const dim = taille === "sm" ? "h-5 w-5 text-[11px]" : "h-7 w-7 text-sm";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-sm font-mono font-bold ${dim}`}
      style={{
        color: GENES[l].couleur,
        background: `${GENES[l].couleur}1a`,
        boxShadow: `inset 0 0 0 1px ${GENES[l].couleur}55`,
      }}
    >
      {l}
    </span>
  );
}

function phrase(c: ExplicationCase): string {
  const pousseCible = c.votes.find((v) => v.gene === c.geneCible);
  const rival = c.votes.find((v) => v.gene !== c.geneCible);
  const p = (n: number) => n.toFixed(1).replace(".", ",");

  switch (c.statut) {
    case "acquis":
      return pousseCible
        ? `Ton plant a déjà le bon gène, et ${pousseCible.nb} donneuse${pousseCible.nb > 1 ? "s le confirment" : " le confirme"}. Rien ne vient le déloger.`
        : "Ton plant a déjà le bon gène, et aucune voisine n'est assez lourde pour le remplacer.";
    case "gagne":
      return `Ton plant a un ${c.geneCentre}. ${pousseCible?.nb} donneuse${(pousseCible?.nb ?? 0) > 1 ? "s poussent" : " pousse"} un ${c.geneCible} : ${p(pousseCible?.poids ?? 0)} contre ${p(Math.max(c.poidsCentre, rival?.poids ?? 0))}. Le ${c.geneCible} passe.`;
    case "egalite":
      return `Égalité à ${p(pousseCible?.poids ?? 0)} entre le ${c.geneCible} et le ${rival?.gene}. Le jeu tire au sort : une chance sur ${Math.round(1 / c.probaCible)}.`;
    case "perdu":
      return `Le ${rival?.gene ?? c.geneCentre} l'emporte avec ${p(Math.max(rival?.poids ?? 0, c.poidsCentre))} contre ${p(pousseCible?.poids ?? 0)}. Il te faut ${c.manque} donneuse${c.manque > 1 ? "s" : ""} de plus portant un ${c.geneCible} ici.`;
    case "menace":
      return `Ton plant a le bon ${c.geneCible}, mais ${rival?.nb} voisine${(rival?.nb ?? 0) > 1 ? "s poussent" : " pousse"} un ${rival?.gene} à ${p(rival?.poids ?? 0)} contre ${p(c.poidsCentre)}. Tu vas le perdre.`;
  }
}

export function ExplicationCases({ cases }: { cases: ExplicationCase[] }) {
  return (
    <ol className="space-y-2">
      {cases.map((c) => {
        const a = APPARENCE[c.statut];
        return (
          <li key={c.index} className={`rounded border ${a.bordure} ${a.fond} p-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-moss-400">
                case {c.index + 1}
              </span>
              <Lettre l={c.geneCentre} taille="sm" />
              <span className="text-moss-400">→</span>
              <Lettre l={c.geneCible} taille="sm" />
              <span className={`ml-auto font-display text-[13px] font-semibold uppercase tracking-wide ${a.texte}`}>
                {a.etiquette}
              </span>
            </div>

            <p className="mt-2 text-[14px] leading-snug text-moss-200">{phrase(c)}</p>

            {c.votes.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-soil-700 pt-2 font-mono text-[11px]">
                <span className="text-moss-400">le vote :</span>
                {c.votes.map((v) => (
                  <span key={v.gene} className="flex items-center gap-1">
                    <Lettre l={v.gene} taille="sm" />
                    <span className="text-moss-400">
                      ×{v.nb} = {v.poids.toFixed(1).replace(".", ",")}
                    </span>
                  </span>
                ))}
                <span className="text-moss-400">
                  · le plant tient à {c.poidsCentre.toFixed(1).replace(".", ",")}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
