"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GENES, type GeneLetter } from "@/data/game";
import type { Demo } from "@/lib/demo";

/**
 * Le moteur, en train de travailler.
 *
 * Une page qui décrit un produit demande un effort ; une page qui le montre
 * n'en demande aucun. La séquence dure une dizaine de secondes et raconte
 * exactement ce que fait le site : une graine sauvage au centre, huit donneuses
 * autour, puis les six cases résolues une par une, avec le vote qui les décide.
 *
 * Elle tourne en boucle, avec une pause de quelques secondes sur le résultat :
 * un visiteur qui arrive en cours de séquence doit pouvoir la reprendre au
 * début sans rien faire.
 *
 * Elle s'arrête dès qu'elle sort de l'écran. Une animation qui continue de
 * tourner pendant qu'on lit trois écrans plus bas ne sert personne et vide la
 * batterie.
 *
 * `prefers-reduced-motion` saute directement au résultat : le contenu reste
 * entier, seul le mouvement disparaît.
 */

type Etape =
  | { phase: "depart" }
  | { phase: "donneuses"; posees: number }
  | { phase: "resolution"; caseCourante: number }
  | { phase: "fini" };

const MS_DONNEUSE = 90;
const MS_CASE = 460;
const MS_AVANT_DEPART = 550;
const MS_PAUSE_FIN = 4200;

export function DemoBac({ demo }: { demo: Demo }) {
  const [etape, setEtape] = useState<Etape>({ phase: "depart" });
  const [anime, setAnime] = useState(false);
  const minuteries = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cadre = useRef<HTMLDivElement>(null);

  const nettoyer = useCallback(() => {
    minuteries.current.forEach(clearTimeout);
    minuteries.current = [];
  }, []);

  const jouer = useCallback(() => {
    nettoyer();
    setEtape({ phase: "depart" });

    let t = MS_AVANT_DEPART;
    for (let i = 1; i <= 8; i++) {
      minuteries.current.push(
        setTimeout(() => setEtape({ phase: "donneuses", posees: i }), t)
      );
      t += MS_DONNEUSE;
    }
    t += 420;
    for (let c = 0; c < 6; c++) {
      minuteries.current.push(
        setTimeout(() => setEtape({ phase: "resolution", caseCourante: c }), t)
      );
      t += MS_CASE;
    }
    minuteries.current.push(setTimeout(() => setEtape({ phase: "fini" }), t));
    // La boucle : on laisse le résultat à l'écran, puis on recommence.
    minuteries.current.push(setTimeout(jouer, t + MS_PAUSE_FIN));
  }, [nettoyer]);

  useEffect(() => {
    const sobre = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sobre) {
      setEtape({ phase: "fini" });
      return;
    }
    setAnime(true);

    const cible = cadre.current;
    if (!cible) {
      jouer();
      return nettoyer;
    }

    // On ne joue que tant que la démonstration est visible.
    const observateur = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? jouer() : nettoyer()),
      { threshold: 0.25 }
    );
    observateur.observe(cible);

    return () => {
      observateur.disconnect();
      nettoyer();
    };
  }, [jouer, nettoyer]);

  const donneusesPosees =
    etape.phase === "depart" ? 0 : etape.phase === "donneuses" ? etape.posees : 8;

  // Une case est résolue dès que l'étape l'a dépassée.
  const casesResolues =
    etape.phase === "fini" ? 6 : etape.phase === "resolution" ? etape.caseCourante + 1 : 0;
  const caseActive = etape.phase === "resolution" ? etape.caseCourante : -1;

  const centre = demo.cible.map((lettre, i) => (i < casesResolues ? lettre : demo.depart[i]));
  const fini = etape.phase === "fini";

  return (
    <div ref={cadre} className="verre overflow-hidden">
      <div className="flex items-center gap-3 border-b border-trait px-4 py-2.5">
        <span className="eyebrow">Le moteur, en direct</span>
        {anime && (
          <span className="ml-auto flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                fini ? "bg-gene-g" : "bg-rouille"
              }`}
              aria-hidden
            />
            <button type="button" onClick={jouer} className="eyebrow transition hover:text-craie">
              Rejouer
            </button>
          </span>
        )}
      </div>

      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-8">
        {/* Le bac */}
        <div className="mx-auto w-max">
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }, (_, position) => {
              if (position === 4) {
                return (
                  <Emplacement
                    key="centre"
                    genome={centre}
                    centre
                    caseActive={caseActive}
                    casesResolues={casesResolues}
                    visible
                    anime={anime}
                  />
                );
              }
              const index = position < 4 ? position : position - 1;
              return (
                <Emplacement
                  key={position}
                  genome={demo.donneuses[index]}
                  caseActive={caseActive}
                  visible={index < donneusesPosees}
                  delai={index * MS_DONNEUSE}
                  anime={anime}
                />
              );
            })}
          </div>

          <p className="mt-2.5 text-center text-[12px] text-poussiere">
            {etape.phase === "depart"
              ? "Une graine sauvage, six gènes rouges"
              : etape.phase === "donneuses"
                ? "On place les donneuses autour"
                : etape.phase === "resolution"
                  ? `Case ${caseActive + 1} sur 6`
                  : "Résolu"}
          </p>
        </div>

        {/* Le verdict, case par case */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="eyebrow">Chances d&apos;obtenir</span>
            <span className="flex gap-0.5">
              {demo.cible.map((l, i) => (
                <Lettre key={i} lettre={l} petite />
              ))}
            </span>
          </div>

          <div
            className={`chiffre mt-1 leading-none transition-all duration-500 ${
              fini ? "text-gene-g" : "text-poussiere"
            }`}
            style={{ fontSize: "var(--t-geant)" }}
          >
            {fini ? Math.round(demo.probabilite * 100) : casesResolues * 0}
            <span className="text-[0.45em]"> %</span>
          </div>

          <ul className="mt-4 grid gap-px overflow-hidden rounded-sm border border-trait bg-trait sm:grid-cols-2">
            {demo.cases.map((c, i) => {
              const resolue = i < casesResolues;
              const active = i === caseActive;
              return (
                <li
                  key={i}
                  className={`flex items-center gap-2.5 px-3 py-2 transition-colors duration-300 ${
                    active ? "bg-case-haute" : "bg-case"
                  }`}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm font-mono text-[12px] font-bold transition-all duration-300"
                    style={{
                      color: resolue ? c.couleur : c.couleurDepart,
                      background: `${resolue ? c.couleur : c.couleurDepart}1f`,
                    }}
                  >
                    {resolue ? c.lettre : c.depart}
                  </span>
                  <span className="min-w-0 truncate text-[12.5px] text-cendre">
                    <span className="chiffre text-craie">
                      {c.poidsPour.toFixed(1).replace(".", ",")}
                    </span>{" "}
                    contre{" "}
                    <span className="chiffre text-craie">
                      {c.poidsCentre.toFixed(1).replace(".", ",")}
                    </span>
                  </span>
                  <span
                    className={`chiffre ml-auto shrink-0 text-[12.5px] transition-opacity duration-300 ${
                      resolue ? "text-gene-g opacity-100" : "opacity-0"
                    }`}
                  >
                    {Math.round(c.probabilite * 100)} %
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-[13px] leading-relaxed text-poussiere">
            Chaque case est résolue exactement, pas simulée. Un gène ne tombe que si le poids cumulé de
            ses donneuses dépasse strictement celui du gène en place.
          </p>
        </div>
      </div>
    </div>
  );
}

function Emplacement({
  genome,
  centre,
  caseActive,
  casesResolues = 0,
  visible,
  delai = 0,
  anime,
}: {
  genome: GeneLetter[];
  centre?: boolean;
  caseActive: number;
  casesResolues?: number;
  visible: boolean;
  delai?: number;
  anime: boolean;
}) {
  return (
    <div
      className={`fente flex-col gap-1 p-1.5 transition-all duration-300 ${
        centre ? "border-rouille bg-case-haute" : ""
      } ${visible || !anime ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
      style={{ transitionDelay: visible ? `${delai}ms` : "0ms" }}
    >
      <div className="flex gap-0.5">
        {genome.map((lettre, j) => (
          <Lettre
            key={j}
            lettre={lettre}
            surlignee={j === caseActive}
            pulse={centre && j === casesResolues - 1}
          />
        ))}
      </div>
    </div>
  );
}

function Lettre({
  lettre,
  surlignee,
  pulse,
  petite,
}: {
  lettre: GeneLetter;
  surlignee?: boolean;
  pulse?: boolean;
  petite?: boolean;
}) {
  const couleur = GENES[lettre].couleur;
  return (
    <span
      className={`flex items-center justify-center rounded-sm font-mono font-bold transition-all duration-300 ${
        petite ? "h-5 w-4 text-[11px]" : "h-4 w-3 text-[10px]"
      } ${surlignee ? "scale-125" : "scale-100"} ${pulse ? "ring-1 ring-gene-g" : ""}`}
      style={{
        color: couleur,
        background: `${couleur}${surlignee ? "3d" : "1f"}`,
      }}
    >
      {lettre}
    </span>
  );
}
