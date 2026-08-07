"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { Champ, Choix, Details, EnTetePage, Page, Reponse } from "@/components/Ui";
import { AlerteConditions, ReglageConditions } from "@/components/Conditions";
import { PLANTES, PLANTE_PAR_ID, type Genome, type PlanteId } from "@/data/game";
import { THES } from "@/data/teas";
import { calculerCroissance, calculerRendement, formatDuree, formatNombre } from "@/lib/model";
import { useConditions, useConstantes } from "@/lib/hooks";

const COMPARATIF = ["GGGGGG", "GGGGYY", "GGGYYY", "GGYYYY", "YYYYYY", "XXXXXX"];
const THE_RECOLTE = THES.find((t) => t.id === "recolte");

export default function PageRendement() {
  const [constantes] = useConstantes();
  const [conditions] = useConditions();
  const [genome, setGenome] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const [nbBacs, setNbBacs] = useState(4);
  const [theRecolte, setTheRecolte] = useState(0);

  const info = PLANTE_PAR_ID[plante];

  const croissance = useMemo(
    () => calculerCroissance(plante, genome, conditions, constantes),
    [plante, genome, conditions, constantes]
  );

  const rendement = useMemo(
    () =>
      calculerRendement(plante, genome, conditions, constantes, {
        plantsParBac: 9,
        bonusTheRecolte: theRecolte,
        minutesCycle: croissance.minutesJusquMur,
      }),
    [plante, genome, conditions, constantes, theRecolte, croissance.minutesJusquMur]
  );

  const comparatif = useMemo(() => {
    return COMPARATIF.map((code) => {
      const g = code.split("") as Genome;
      const c = calculerCroissance(plante, g, conditions, constantes);
      const r = calculerRendement(plante, g, conditions, constantes, {
        plantsParBac: 9,
        bonusTheRecolte: theRecolte,
        minutesCycle: c.minutesJusquMur,
      });
      return { code, genome: g, minutes: c.minutesJusquMur, parPlant: r.parPlant, parHeure: r.parHeure * nbBacs };
    }).sort((a, b) => b.parHeure - a.parHeure);
  }, [plante, conditions, constantes, theRecolte, nbBacs]);

  const meilleur = comparatif[0]?.parHeure ?? 1;

  return (
    <Page>
      <EnTetePage titre="Rendement" intro="Ce que des gènes rapportent, et en combien de temps." />

      <AlerteConditions />

      <div className="space-y-5 rounded-lg border border-soil-600 bg-soil-850 p-5">
        <Champ label="Gènes">
          <EditeurGenes genome={genome} onChange={setGenome} taille="md" />
        </Champ>
        <Champ label="Plante">
          <Choix valeur={plante} onChange={setPlante} options={PLANTES.map((p) => ({ label: p.nom, valeur: p.id }))} />
        </Champ>
        <div className="w-32">
          <Champ label="Grands bacs">
            <input
              type="number"
              min={1}
              max={64}
              className="champ"
              value={nbBacs}
              onChange={(e) => setNbBacs(Math.max(1, Number(e.target.value)))}
            />
          </Champ>
        </div>
      </div>

      <div className="mt-6">
        <Reponse
          valeur={formatNombre(rendement.parHeure * nbBacs, 0)}
          unite={`${info.ressource} / h`}
          legende={`sur ${nbBacs} grand${nbBacs > 1 ? "s" : ""} bac${nbBacs > 1 ? "s" : ""}, si tu replantes dès la récolte.`}
          secondaires={[
            { label: "Jusqu'à la récolte", valeur: formatDuree(croissance.minutesJusquMur) },
            { label: "Par plant", valeur: formatNombre(rendement.parPlant) },
            { label: "Par bac", valeur: formatNombre(rendement.parBac, 0) },
          ]}
        />
      </div>

      <section className="mt-8">
        <h2 className="titre mb-1 text-xl">Le cycle</h2>
        <p className="mb-4 text-[14px] text-moss-400">
          Instants comptés depuis la plantation. Les deux derniers stades viennent après la récolte idéale.
        </p>
        <ul className="space-y-1.5">
          {croissance.minutesParStade.map((s) => {
            const cle = s.id === "croisement";
            const mur = s.id === "mur";
            const mourant = s.id === "mourant";
            return (
              <li
                key={s.id}
                className={`rounded border px-3 py-2.5 ${
                  cle
                    ? "border-lamp/50 bg-lamp/8"
                    : mur
                      ? "border-ripe/50 bg-ripe/8"
                      : mourant
                        ? "border-gene-w/40 bg-gene-w/5"
                        : "border-soil-600 bg-soil-850"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span
                    className={`font-display text-[15px] font-semibold uppercase tracking-wide ${
                      cle ? "text-lamp-glow" : mur ? "text-ripe" : mourant ? "text-gene-w" : "text-moss-200"
                    }`}
                  >
                    {s.nom}
                  </span>
                  <span className="font-mono text-[13px] text-moss-400">
                    {s.debut < 0.5 ? "dès la plantation" : `à partir de ${formatDuree(s.debut)}`} · dure{" "}
                    {formatDuree(s.minutes)}
                  </span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-moss-400">{s.note}</p>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[13px] leading-relaxed text-moss-400">
          Les noms des sept stades sont ceux du jeu, confirmés par plusieurs sources. Leurs durées relatives,
          elles, sont estimées à partir d&apos;une seule série de mesures publiée — prends-les comme un ordre
          de grandeur.
        </p>
      </section>

      <div className="mt-10">
        <Details titre="Vitesse contre rendement">
          <ul className="space-y-2">
            {comparatif.map((c) => (
              <li key={c.code} className="flex flex-wrap items-center gap-3">
                <ChaineGenes genome={c.genome} taille="sm" />
                <span className="w-20 font-mono text-[12px] text-moss-400">{formatDuree(c.minutes)}</span>
                <div className="min-w-[80px] flex-1">
                  <div className="h-2 w-full overflow-hidden rounded-sm bg-soil-700">
                    <span
                      className="block h-full bg-lamp"
                      style={{ width: `${Math.max(2, (c.parHeure / meilleur) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="w-24 text-right font-mono text-[13px] text-moss-100">
                  {formatNombre(c.parHeure, 0)} /h
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-moss-400">
            Débit sur {nbBacs} bac{nbBacs > 1 ? "s" : ""}. Si tu joues peu, préfère le rendement : tes plants
            t&apos;attendront de toute façon.
          </p>
        </Details>

        <Details titre="Conditions du bac">
          <ReglageConditions />
        </Details>

        <Details titre="Thé de récolte">
          <Choix
            valeur={theRecolte}
            onChange={setTheRecolte}
            options={[
              { label: "Aucun", valeur: 0 },
              { label: "Basique", valeur: THE_RECOLTE?.gain?.[0] ?? 0.35 },
              { label: "Avancé", valeur: THE_RECOLTE?.gain?.[1] ?? 0.6 },
              { label: "Pur", valeur: THE_RECOLTE?.gain?.[2] ?? 0.9 },
            ]}
          />
          <p className="mt-3 text-[13px] text-moss-400">
            À boire juste avant de tout ramasser. Les valeurs Avancé et Pur ne sont confirmées que par une seule
            source — à vérifier en jeu.
          </p>
        </Details>

        <Details titre="D'où viennent ces chiffres">
          <p className="text-[14px] leading-relaxed text-moss-200">
            D&apos;un modèle calé sur deux repères communautaires, pas de valeurs officielles. Chronomètre un
            cycle en jeu et corrige-le dans{" "}
            <Link href="/reglages" className="text-lamp-glow underline underline-offset-2">
              Réglages
            </Link>
            .
          </p>
        </Details>
      </div>
    </Page>
  );
}
