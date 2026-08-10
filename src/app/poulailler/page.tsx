"use client";

import { useMemo, useState } from "react";
import { Champ, Details, EnTetePage, Note, Page, Reponse } from "@/components/Ui";
import { IconeObjet } from "@/components/IconePlante";
import { VoirAussi } from "@/components/VoirAussi";
import { TARTES } from "@/data/teas";
import { formatDuree, formatNombre } from "@/lib/model";

const OEUF_TOUTES_LES_MIN = 2;
const CAPACITE_SORTIE = 20;
const POULES_MAX = 4;

export default function PagePoulailler() {
  const [poules, setPoules] = useState(4);
  const [poulaillers, setPoulaillers] = useState(1);
  const [bonheur, setBonheur] = useState(1);

  const calc = useMemo(() => {
    const totalPoules = Math.min(poules, POULES_MAX) * poulaillers;
    const parMin = (totalPoules / OEUF_TOUTES_LES_MIN) * bonheur;
    const parHeure = parMin * 60;
    const saturation = parMin > 0 ? (CAPACITE_SORTIE * poulaillers) / parMin : Infinity;
    return { totalPoules, parHeure, saturation };
  }, [poules, poulaillers, bonheur]);

  const tartes = useMemo(
    () =>
      TARTES.map((t) => {
        const oeufs = t.ingredients.find((i) => i.nom === "Œuf")?.qte ?? 0;
        return { nom: t.nom, oeufs, parHeure: oeufs > 0 ? calc.parHeure / oeufs : 0 };
      }).filter((t) => t.oeufs > 0),
    [calc.parHeure]
  );

  return (
    <Page>
      <EnTetePage
        titre="Poulailler"
        intro="Les œufs sont le goulot d'étranglement de toutes les tartes. Quatre poules par poulailler, un œuf toutes les deux minutes chacune."
      />

      <div className="flex flex-wrap gap-5 panneau">
        <div className="w-28">
          <Champ label="Poulaillers">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              className="champ"
              value={poulaillers}
              onChange={(e) => setPoulaillers(Math.max(1, Number(e.target.value)))}
            />
          </Champ>
        </div>
        <div className="w-28">
          <Champ label="Poules / coop">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={POULES_MAX}
              className="champ"
              value={poules}
              onChange={(e) => setPoules(Math.min(POULES_MAX, Math.max(1, Number(e.target.value))))}
            />
          </Champ>
        </div>
        <div className="min-w-[12rem] flex-1">
          <Champ label={`Jauges au vert · ${Math.round(bonheur * 100)} %`}>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.1}
              className="mt-2 w-full"
              value={bonheur}
              onChange={(e) => setBonheur(Number(e.target.value))}
            />
          </Champ>
        </div>
      </div>

      <div className="mt-6">
        <Reponse
          valeur={formatNombre(calc.parHeure, 0)}
          unite="œufs / h"
          legende={`avec ${calc.totalPoules} poule${calc.totalPoules > 1 ? "s" : ""}.`}
          secondaires={[
            { label: "Par jour réel", valeur: formatNombre(calc.parHeure * 24, 0) },
            { label: "Saturation", valeur: formatDuree(calc.saturation) },
          ]}
        />
      </div>

      <div className="mt-6">
        <Note ton="alerte">
          La case de sortie plafonne à {CAPACITE_SORTIE} œufs par poulailler, et la ponte s&apos;arrête quand
          elle est pleine. Passe ramasser toutes les {formatDuree(calc.saturation)}, sinon tu produis dans le
          vide.
        </Note>
      </div>

      <section className="mt-10">
        <h2 className="titre mb-3 text-xl">Tartes possibles par heure</h2>
        <ul className="space-y-1.5">
          {tartes.map((t) => (
            <li
              key={t.nom}
              className="flex items-baseline justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
            >
              <span className="text-[14px] text-feuille-100">{t.nom}</span>
              <span className="font-mono text-[13px] text-feuille-400">
                {t.oeufs} œufs · <span className="text-feuille-100">{formatNombre(t.parHeure, 1)} / h</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[13px] text-feuille-400">
          Les œufs ne sont qu&apos;un ingrédient : le blé et la viande cuite limitent souvent plus vite.
        </p>
      </section>

      <div className="mt-10">
        <Details titre="Monter un poulailler">
          <ol className="space-y-3 text-[14px] leading-relaxed text-feuille-200">
            <li>
              <span className="text-feuille-100">Trouve un œuf.</span> Les poules sauvages en lâchent un de temps
              en temps quand tu es à proximité. Un seul suffit : la boucle s&apos;auto-alimente ensuite.
            </li>
            <li>
              <span className="text-feuille-100">Pose le poulailler.</span> Plan de base, aucun établi requis. Il
              déborde d&apos;une fondation — prévois la place. À ciel ouvert, sinon la jauge Soleil ne monte
              jamais.
            </li>
            <li>
              <span className="text-feuille-100">Fais éclore.</span> Œuf dans la case, bouton Éclore, 120
              secondes. Le poussin a besoin d&apos;environ une journée en jeu avant de pondre.
            </li>
            <li>
              <span className="text-feuille-100">Nourris et abreuve.</span> Graines, maïs, blé, baies, pommes de
              terre, citrouilles, vers. Le réservoir plafonne à 1000 mL.
            </li>
            <li>
              <span className="text-feuille-100">Caresse-les.</span> La jauge Amour se remplit en interagissant.
              Quatre jauges au vert, ponte maximale.
            </li>
          </ol>
        </Details>

        <Details titre="Le poulailler comme boucherie">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Abattre une poule donne du blanc de poulet, de la graisse animale et des plumes. Comme tu peux faire
            éclore un remplaçant dans la foulée sans pénaliser les autres, un poulailler tenu en mode couvoir
            tourne en boucle fermée : œufs dedans, viande dehors. La graisse alimente la table de mixage et le
            carburant bas de gamme, les plumes font les flèches.
          </p>
        </Details>

        <Details titre="Ce qui tue une poule">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Le réservoir de 1000 mL. Sans plomberie, il se vide bien avant que tu reviennes de raid. Branche un
            arroseur ou une pompe si tu tiens à ton élevage sur la durée.
          </p>
        </Details>
      </div>
      <VoirAussi
        liens={[
          { href: "/tartes", label: "Tartes", detail: "Ce que tu peux faire des œufs produits." },
          { href: "/ferme", label: "Ma ferme", detail: "Déclarer tes poulaillers pour qu'ils comptent dans la production." },
        ]}
      />

    </Page>
  );
}
