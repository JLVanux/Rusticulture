"use client";

import { useMemo, useState } from "react";
import { Champ, Choix, Details, EnTetePage, Note, Page, Reponse } from "@/components/Ui";
import { VoirAussi } from "@/components/VoirAussi";
import { PALIERS, TARTES, THES, type Palier } from "@/data/teas";
import { SOUFRE_PAR_NOEUD } from "@/data/raid";
import { formatNombre } from "@/lib/model";

const OURS = TARTES.find((t) => t.id === "ours")!;
const RECOLTE = THES.filter((t) => t.famille === "recolte" && t.gain);

export default function PageTartes() {
  const [theId, setTheId] = useState("minerai");
  const [palier, setPalier] = useState<Palier>("pur");
  const [base, setBase] = useState(SOUFRE_PAR_NOEUD);

  const the = THES.find((t) => t.id === theId)!;
  const i = PALIERS.findIndex((p) => p.id === palier);
  const gain = the.gain?.[i] ?? 0;

  const calc = useMemo(() => {
    const seul = base * (1 + gain);
    const avecTarte = base * (1 + gain * (OURS.multiplicateurThe ?? 1));
    return {
      seul,
      avecTarte,
      duree: the.dureeMin * (OURS.multiplicateurDuree ?? 0.5),
      gainAvec: gain * (OURS.multiplicateurThe ?? 1),
    };
  }, [base, gain, the]);

  return (
    <Page>
      <EnTetePage
        titre="Tartes"
        intro="Une seule tarte touche à tes thés de récolte : celle à l'ours. Elle amplifie le gain, et coupe la durée de moitié."
      />

      <div className="space-y-5 panneau">
        <Champ label="Thé de récolte">
          <Choix
            valeur={theId}
            onChange={setTheId}
            options={RECOLTE.map((t) => ({ label: t.nom.replace("Thé de ", ""), valeur: t.id }))}
          />
        </Champ>
        <Champ label="Palier">
          <Choix
            valeur={palier}
            onChange={setPalier}
            options={PALIERS.map((p) => ({ label: p.nom, valeur: p.id }))}
          />
        </Champ>
        <div className="w-40">
          <Champ label="Récolte de base par nœud">
            <input
              type="number"
              min={1}
              className="champ"
              value={base}
              onChange={(e) => setBase(Math.max(1, Number(e.target.value)))}
            />
          </Champ>
        </div>
      </div>

      <div className="mt-6">
        <Reponse
          valeur={`+${Math.round(calc.gainAvec * 100)} %`}
          legende={`avec le combo ${the.nom.toLowerCase()} ${PALIERS[i].nom.toLowerCase()} + tarte à l'ours, sur une fenêtre de ${calc.duree} minutes au lieu de ${the.dureeMin}.`}
          secondaires={[
            { label: "Sans rien", valeur: formatNombre(base, 0) },
            { label: "Thé seul", valeur: formatNombre(calc.seul, 0) },
            { label: "Thé + tarte", valeur: formatNombre(calc.avecTarte, 0) },
          ]}
        />
      </div>

      <div className="mt-6">
        <Note ton="alerte">
          Tu perds {Math.round(the.dureeMin / 2)} minutes de buff pour gagner{" "}
          {Math.round((calc.gainAvec - gain) * 100)} points de pourcentage. Ça vaut le coup si tu enchaînes les
          nœuds sans temps mort — pas si tu passes la moitié du temps à te déplacer.
        </Note>
      </div>

      <section className="mt-10">
        <h2 className="titre mb-3 text-xl">Les tartes qui servent</h2>
        <ul className="space-y-2">
          {TARTES.filter((t) => ["ours", "poulet", "citrouille", "porc"].includes(t.id)).map((t) => (
            <li
              key={t.id}
              className={`rounded border p-4 ${
                t.id === "ours" ? "border-lampe/50 bg-lampe/8" : "border-white/10 bg-nuit-800"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3
                  className={`font-display text-lg font-semibold uppercase tracking-wide ${
                    t.id === "ours" ? "text-lampe-chaud" : "text-feuille-100"
                  }`}
                >
                  {t.nom}
                </h3>
                <span className="font-mono text-[12px] text-feuille-400">
                  {t.buff} · {t.dureeMin} min
                </span>
              </div>
              <p className="mt-1.5 text-[14px] leading-snug text-feuille-200">{t.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <Details titre="Toutes les recettes de tarte">
          <ul className="space-y-3">
            {TARTES.map((t) => (
              <li key={t.id} className="border-b border-white/[0.07] pb-3 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] text-feuille-100">{t.nom}</span>
                  <span className="font-mono text-[12px] text-feuille-400">{t.buff}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {t.ingredients.map((ing) => (
                    <span key={ing.nom} className="puce border-nuit-500 text-feuille-400">
                      {ing.qte}× {ing.nom}
                    </span>
                  ))}
                </div>
                {t.avertissement && <p className="mt-1.5 text-[12px] text-mur">{t.avertissement}</p>}
              </li>
            ))}
          </ul>
        </Details>

        <Details titre="Ce qui se cumule">
          <ul className="space-y-1.5 font-mono text-[13px]">
            {[
              ["Tarte à l'ours + thé de récolte", true],
              ["Thés de familles différentes", true],
              ["Deux thés de la même famille", false],
              ["Tarte à la citrouille + thé de vie max", false],
            ].map(([label, ok]) => (
              <li key={label as string} className="flex justify-between gap-3">
                <span className="text-feuille-200">{label as string}</span>
                <span className={ok ? "text-gene-g" : "text-gene-w"}>{ok ? "oui" : "non"}</span>
              </li>
            ))}
          </ul>
        </Details>

        <Details titre="Monter la cuisine">
          <ul className="space-y-2 text-[14px] leading-relaxed text-feuille-200">
            <li>
              <span className="text-feuille-100">Établi de cuisine</span> — fabrication à l&apos;établi 1. Il sert
              aussi de table de mixage pour les thés.
            </li>
            <li>
              <span className="text-feuille-100">Œufs et blé</span> — dans presque toutes les tartes. Le blé pousse
              près des rivières et se met en bac comme le maïs.
            </li>
            <li>
              <span className="text-feuille-100">Frigo électrique, 1 W</span> — sans lui, la viande et les tartes
              pourrissent avant que tu t&apos;en serves.
            </li>
          </ul>
        </Details>
      </div>
      <VoirAussi
        liens={[
          { href: "/poulailler", label: "Poulailler", detail: "Les œufs limitent toutes les tartes." },
          { href: "/thes", label: "Thés", detail: "Le thé que la tarte à l'ours vient amplifier." },
        ]}
      />

    </Page>
  );
}
