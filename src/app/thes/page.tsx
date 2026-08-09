"use client";

import { useMemo, useState } from "react";
import { EditeurGenes } from "@/components/Genes";
import { Champ, Details, EnTetePage, Note, Page, Reponse } from "@/components/Ui";
import { VoirAussi } from "@/components/VoirAussi";
import { AlerteConditions } from "@/components/Conditions";
import { BAIES, type BaieId, type Genome } from "@/data/game";
import { PALIERS, THES, type Palier } from "@/data/teas";
import {
  calculerBesoinThes,
  calculerCroissance,
  calculerRendement,
  formatDuree,
  formatNombre,
  thesPossibles,
  type LigneCommande,
} from "@/lib/model";
import { useConditions, useConstantes } from "@/lib/hooks";

const VIDE = (): Record<BaieId, number> => ({ rouge: 0, jaune: 0, bleue: 0, verte: 0, blanche: 0 });

export default function PageThes() {
  const [constantes] = useConstantes();
  const [conditions] = useConditions();
  const [commande, setCommande] = useState<LigneCommande[]>([
    { theId: "minerai", palier: "pur", quantite: 5 },
  ]);
  const [genome, setGenome] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);
  const [bacsParCouleur, setBacsParCouleur] = useState(1);
  const [stock, setStock] = useState<Record<BaieId, number>>(VIDE());

  const besoin = useMemo(() => calculerBesoinThes(commande), [commande]);

  const plant = useMemo(() => {
    const c = calculerCroissance("baie_rouge", genome, conditions, constantes);
    const r = calculerRendement("baie_rouge", genome, conditions, constantes, {
      plantsParBac: 9,
      bonusTheRecolte: 0,
      minutesCycle: c.minutesJusquMur,
    });
    return { parPlant: r.parPlant, parBac: r.parBac, minutes: c.minutesJusquMur };
  }, [genome, conditions, constantes]);

  const detail = useMemo(
    () =>
      BAIES.map((b) => {
        const requis = besoin.baies[b.id];
        const capacite = plant.parBac * bacsParCouleur;
        const cycles = requis > 0 ? Math.ceil(requis / capacite) : 0;
        return { ...b, requis, cycles, minutes: cycles * plant.minutes };
      }),
    [besoin, plant, bacsParCouleur]
  );

  const totalBaies = Object.values(besoin.baies).reduce((a, b) => a + b, 0);
  const cyclesMax = Math.max(0, ...detail.map((d) => d.cycles));
  const couleursUtiles = detail.filter((d) => d.requis > 0);
  const aVerifier = commande
    .map((l) => THES.find((t) => t.id === l.theId))
    .filter((t) => t?.aVerifier);

  const stockTotal = Object.values(stock).reduce((a, b) => a + b, 0);

  function maj(i: number, m: Partial<LigneCommande>) {
    setCommande((p) => p.map((l, j) => (j === i ? { ...l, ...m } : l)));
  }

  return (
    <Page>
      <EnTetePage
        titre="Thés"
        intro="Un thé pur coûte seize thés basiques, donc soixante-quatre baies. Dis combien tu en veux."
      />

      <AlerteConditions />

      {/* Commande */}
      <section className="panneau">
        <ul className="space-y-2">
          {commande.map((ligne, i) => (
            <li key={i} className="flex flex-wrap items-end gap-2">
              <div className="w-20">
                <label className="eyebrow mb-1 block" htmlFor={`q${i}`}>
                  Nombre
                </label>
                <input
                  id={`q${i}`}
                  type="number"
                  min={0}
                  className="champ"
                  value={ligne.quantite}
                  onChange={(e) => maj(i, { quantite: Math.max(0, Number(e.target.value)) })}
                />
              </div>
              <div className="min-w-[9rem] flex-1">
                <label className="eyebrow mb-1 block" htmlFor={`t${i}`}>
                  Thé
                </label>
                <select
                  id={`t${i}`}
                  className="champ"
                  value={ligne.theId}
                  onChange={(e) => maj(i, { theId: e.target.value })}
                >
                  {THES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28">
                <label className="eyebrow mb-1 block" htmlFor={`p${i}`}>
                  Palier
                </label>
                <select
                  id={`p${i}`}
                  className="champ"
                  value={ligne.palier}
                  onChange={(e) => maj(i, { palier: e.target.value as Palier })}
                >
                  {PALIERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </div>
              {commande.length > 1 && (
                <button
                  type="button"
                  className="pb-2.5 font-mono text-[11px] uppercase tracking-wider text-feuille-400 hover:text-gene-w"
                  onClick={() => setCommande((p) => p.filter((_, j) => j !== i))}
                >
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="bouton mt-3"
          onClick={() => setCommande((p) => [...p, { theId: "ferraille", palier: "pur", quantite: 5 }])}
        >
          + Ajouter un thé
        </button>
      </section>

      {/* Réponse */}
      <div className="mt-6">
        <Reponse
          valeur={formatNombre(totalBaies, 0)}
          unite="baies"
          legende={`à récolter, réparties sur ${couleursUtiles.length} couleur${couleursUtiles.length > 1 ? "s" : ""}.`}
          secondaires={[
            { label: "Thés basiques", valeur: formatNombre(besoin.thesBasiques, 0) },
            { label: "Bacs à monter", valeur: String(couleursUtiles.length * bacsParCouleur) },
            { label: "Temps", valeur: formatDuree(cyclesMax * plant.minutes) },
          ]}
        />
      </div>

      {/* Détail par couleur : c'est la liste de courses */}
      <section className="mt-6">
        <ul className="space-y-1.5">
          {couleursUtiles.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: d.couleur }} aria-hidden />
              <span className="text-[15px] text-feuille-100">Baie {d.nom.toLowerCase()}</span>
              <span className="ml-auto font-mono text-[15px] font-bold text-feuille-100">
                {formatNombre(d.requis, 0)}
              </span>
              <span className="w-32 text-right font-mono text-[12px] text-feuille-400">
                {d.cycles} cycle{d.cycles > 1 ? "s" : ""} · {formatDuree(d.minutes)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {aVerifier.length > 0 && (
        <div className="mt-4">
          <Note ton="alerte">
            {aVerifier.map((t) => `${t!.nom} : ${t!.aVerifier}`).join(" ")}
          </Note>
        </div>
      )}

      <div className="mt-10">
        <Details titre="Ton plant de baies">
          <div className="space-y-4">
            <Champ label="Gènes">
              <EditeurGenes genome={genome} onChange={setGenome} taille="md" />
            </Champ>
            <div className="w-32">
              <Champ label="Bacs par couleur">
                <input
                  type="number"
                  min={1}
                  className="champ"
                  value={bacsParCouleur}
                  onChange={(e) => setBacsParCouleur(Math.max(1, Number(e.target.value)))}
                />
              </Champ>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-feuille-400">
            Ce gènes donne {formatNombre(plant.parPlant)} baies par plant, soit{" "}
            {formatNombre(plant.parBac, 0)} par grand bac et par cycle de {formatDuree(plant.minutes)}. Les
            couleurs ne se croisent pas entre elles : il te faut un bac par couleur au minimum.
          </p>
        </Details>

        <Details titre="J'ai déjà des baies, j'en fais quoi">
          <div className="flex flex-wrap gap-3">
            {BAIES.map((b) => (
              <label key={b.id} className="w-24">
                <span className="mb-1 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.couleur }} aria-hidden />
                  <span className="eyebrow">{b.nom}</span>
                </span>
                <input
                  type="number"
                  min={0}
                  className="champ"
                  value={stock[b.id]}
                  onChange={(e) => setStock({ ...stock, [b.id]: Math.max(0, Number(e.target.value)) })}
                />
              </label>
            ))}
          </div>

          {stockTotal > 0 && (
            <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-[14px]">
              <thead>
                <tr className="border-b border-white/10">
                  {["Thé", "Basique", "Avancé", "Pur"].map((h) => (
                    <th key={h} className="pb-2 font-mono text-[11px] uppercase tracking-wider text-feuille-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {THES.map((t) => {
                  const vals = PALIERS.map((p) => thesPossibles(t.id, p.id, stock));
                  if (vals.every((v) => v === 0)) return null;
                  return (
                    <tr key={t.id} className="border-b border-white/[0.07]">
                      <td className="py-2 text-feuille-100">{t.nom}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={`font-mono ${v > 0 ? "text-feuille-100" : "text-feuille-400 opacity-40"}`}>
                          {v || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </Details>

        <Details titre="Toutes les recettes">
          <ul className="space-y-2.5">
            {THES.map((t) => (
              <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="flex shrink-0 gap-1" aria-label={t.recette.join(", ")}>
                  {t.recette.map((r, i) => (
                    <span
                      key={i}
                      className="h-3.5 w-3.5 rounded-sm"
                      style={{ background: BAIES.find((x) => x.id === r)?.couleur }}
                      title={BAIES.find((x) => x.id === r)?.nom}
                    />
                  ))}
                </span>
                <span className="text-[14px] text-feuille-100">{t.nom}</span>
                <span className="font-mono text-[12px] text-feuille-400">{t.paliers.join(" · ")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-feuille-400">
            Quatre baies pour un thé basique, quatre thés du palier inférieur pour monter d&apos;un cran.
            L&apos;ordre des baies compte sur la table de mixage.
          </p>
        </Details>
      </div>
      <VoirAussi
        liens={[
          { href: "/tartes", label: "Tartes", detail: "La tarte à l'ours multiplie l'effet du thé de récolte." },
          { href: "/genetique", label: "Mes graines", detail: "Quelles baies tu possèdes déjà." },
          { href: "/rendement", label: "Rendement", detail: "Combien de baies par cycle avec tes gènes." },
        ]}
      />

    </Page>
  );
}
