"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Choix, Details, EnTetePage, Note, Page, Reponse } from "@/components/Ui";
import { CIBLES, EXPLOSIFS, SOUFRE_PAR_NOEUD } from "@/data/raid";
import { TARTES, THES } from "@/data/teas";
import { formatNombre } from "@/lib/model";

const OURS = TARTES.find((t) => t.id === "ours")!;
const MINERAI = THES.find((t) => t.id === "minerai")!;

function moinsCher(cibleId: string) {
  const cible = CIBLES.find((c) => c.id === cibleId);
  if (!cible) return null;
  let best: { id: string; nb: number; soufre: number } | null = null;
  for (const [id, nb] of Object.entries(cible.couts)) {
    if (!nb) continue;
    const ex = EXPLOSIFS.find((e) => e.id === id);
    if (!ex) continue;
    const soufre = ex.soufre * nb;
    if (!best || soufre < best.soufre) best = { id, nb, soufre };
  }
  return best;
}

export default function PageRaid() {
  const [plan, setPlan] = useState<{ cibleId: string; quantite: number }[]>([]);
  const [bonus, setBonus] = useState(0);

  const total = useMemo(() => {
    let soufre = 0;
    const parExplosif: Record<string, number> = {};
    for (const l of plan) {
      const b = moinsCher(l.cibleId);
      if (!b) continue;
      soufre += b.soufre * l.quantite;
      parExplosif[b.id] = (parExplosif[b.id] ?? 0) + b.nb * l.quantite;
    }
    const parNoeud = SOUFRE_PAR_NOEUD * (1 + bonus);
    return { soufre, parExplosif, noeuds: soufre / parNoeud, parNoeud };
  }, [plan, bonus]);

  function ajouter(cibleId: string) {
    setPlan((p) => {
      const ex = p.find((l) => l.cibleId === cibleId);
      if (ex) return p.map((l) => (l.cibleId === cibleId ? { ...l, quantite: l.quantite + 1 } : l));
      return [...p, { cibleId, quantite: 1 }];
    });
  }

  const gainPur = MINERAI.gain?.[2] ?? 0.5;

  return (
    <Page large>
      <EnTetePage
        titre="Coût de raid"
        intro="Le soufre est ce qui te limite, pas les explosifs. Les comptes sont côté tendre du mur."
      />

      {/* Choix des cibles */}
      <section className="space-y-3">
        {(["porte", "mur"] as const).map((cat) => (
          <div key={cat}>
            <h2 className="eyebrow mb-2">{cat === "porte" ? "Portes" : "Murs"}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {CIBLES.filter((c) => c.categorie === cat).map((c) => {
                const b = moinsCher(c.id);
                const ex = EXPLOSIFS.find((e) => e.id === b?.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => ajouter(c.id)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:border-lampe/60"
                  >
                    <span className="text-[15px] text-feuille-100">{c.nom}</span>
                    <span className="ml-auto font-mono text-[12px] text-feuille-400">
                      {b?.nb}× {ex?.nom}
                    </span>
                    <span className="font-mono text-[13px] text-lampe-chaud">
                      {formatNombre(b?.soufre ?? 0, 0)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Plan */}
      {plan.length > 0 && (
        <>
          <div className="mt-8">
            <Reponse
              valeur={formatNombre(total.soufre, 0)}
              unite="soufre"
              legende={`soit environ ${formatNombre(total.noeuds, 0)} nœuds à miner, à ${formatNombre(total.parNoeud, 0)} par nœud.`}
              secondaires={Object.entries(total.parExplosif).map(([id, nb]) => ({
                label: EXPLOSIFS.find((e) => e.id === id)?.nom ?? id,
                valeur: String(nb),
              }))}
            />
          </div>

          <section className="mt-5">
            <ul className="space-y-1.5">
              {plan.map((l) => {
                const c = CIBLES.find((x) => x.id === l.cibleId)!;
                return (
                  <li
                    key={l.cibleId}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  >
                    <span className="flex-1 text-[14px] text-feuille-100">{c.nom}</span>
                    <button
                      type="button"
                      aria-label="Retirer"
                      className="h-7 w-7 rounded border border-nuit-500 text-feuille-200"
                      onClick={() =>
                        setPlan((p) =>
                          p
                            .map((x) => (x.cibleId === l.cibleId ? { ...x, quantite: x.quantite - 1 } : x))
                            .filter((x) => x.quantite > 0)
                        )
                      }
                    >
                      −
                    </button>
                    <span className="w-7 text-center font-mono text-sm text-feuille-100">{l.quantite}</span>
                    <button
                      type="button"
                      aria-label="Ajouter"
                      className="h-7 w-7 rounded border border-nuit-500 text-feuille-200"
                      onClick={() => ajouter(l.cibleId)}
                    >
                      +
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="bouton mt-3" onClick={() => setPlan([])}>
              Vider le plan
            </button>
          </section>

          <section className="mt-6">
            <div className="eyebrow mb-2">Ce que tu bois en minant</div>
            <Choix
              valeur={bonus}
              onChange={setBonus}
              options={[
                { label: "Rien", valeur: 0 },
                { label: "Thé avancé", valeur: MINERAI.gain?.[1] ?? 0.35 },
                { label: "Thé pur", valeur: gainPur },
                { label: "Pur + tarte", valeur: gainPur * (OURS.multiplicateurThe ?? 1) },
              ]}
            />
            <p className="mt-3 text-[13px] text-feuille-400">
              C&apos;est là que l&apos;agriculture paie : le{" "}
              <Link href="/tartes" className="text-lampe-chaud underline underline-offset-2">
                combo thé + tarte
              </Link>{" "}
              enlève des heures de minage sur un gros raid.
            </p>
          </section>
        </>
      )}

      <div className="mt-10">
        <Details titre="Tableau complet des explosifs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-2 font-mono text-[11px] uppercase tracking-wider text-feuille-400">Cible</th>
                  <th className="pb-2 font-mono text-[11px] uppercase tracking-wider text-feuille-400">PV</th>
                  {EXPLOSIFS.map((e) => (
                    <th
                      key={e.id}
                      className="pb-2 text-right font-mono text-[11px] uppercase tracking-wider text-feuille-400"
                    >
                      {e.nom}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CIBLES.map((c) => {
                  const b = moinsCher(c.id);
                  return (
                    <tr key={c.id} className="border-b border-white/[0.07]">
                      <td className="py-2 text-feuille-100">{c.nom}</td>
                      <td className="font-mono text-[13px] text-feuille-400">{c.pv}</td>
                      {EXPLOSIFS.map((e) => {
                        const nb = c.couts[e.id];
                        return (
                          <td
                            key={e.id}
                            className={`text-right font-mono text-[13px] ${
                              b?.id === e.id
                                ? "font-bold text-lampe-chaud"
                                : nb
                                  ? "text-feuille-200"
                                  : "text-feuille-400 opacity-30"
                            }`}
                          >
                            {nb ?? "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-feuille-400">
            En surbrillance : l&apos;option la moins chère en soufre. Les balles explosives sont souvent les
            moins chères sur le papier, mais il faut une arme à tir soutenu pour en placer cinquante sans temps
            de recharge.
          </p>
        </Details>
      </div>

      <div className="mt-6">
        <Note ton="alerte">
          Les PV et les dégâts bougent d&apos;une mise à jour à l&apos;autre. Avant un raid qui compte, recoupe
          en jeu.
        </Note>
      </div>
    </Page>
  );
}
