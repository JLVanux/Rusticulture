"use client";

import { useMemo, useState } from "react";
import { Champ, Choix, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { VoirAussi } from "@/components/VoirAussi";
import { ReglageDiscord } from "@/components/ReglageDiscord";
import { useFermeActive } from "@/lib/graines";
import { IconePlante } from "@/components/IconePlante";
import { PLANTES, PLANTE_PAR_ID, type Genome, type PlanteId } from "@/data/game";
import {
  CONSTANTES_DEFAUT,
  calculerCroissance,
  calculerRendement,
  formatDuree,
  formatNombre,
} from "@/lib/model";
import { useBanque, useConditions, useConstantes, useMinuteurs } from "@/lib/hooks";

const CURSEURS = [
  {
    cle: "facteurG" as const,
    label: "Réduction du temps par gène G",
    aide: "0,17 : chaque G retire 17 % au temps restant. L'effet est dégressif — 3G retirent environ 43 %, pas 51 %.",
    min: 0,
    max: 0.5,
    pas: 0.01,
  },
  {
    cle: "facteurY" as const,
    label: "Gain de récolte par gène Y",
    aide: "0,27 : un seul Y ajoute 27 % à la récolte de base.",
    min: 0,
    max: 1,
    pas: 0.01,
  },
  {
    cle: "facteurH" as const,
    label: "Rattrapage par gène H",
    aide: "Ce que la robustesse compense quand les conditions ne sont pas au maximum.",
    min: 0,
    max: 0.5,
    pas: 0.01,
  },
  {
    cle: "tauxServeur" as const,
    label: "Multiplicateur du serveur",
    aide: "1 en vanilla, 2 sur un serveur 2×.",
    min: 0.25,
    max: 10,
    pas: 0.25,
  },
];

export default function PageReglages() {
  // Les notifications sont un réglage de la ferme : leur place est ici, pas
  // dans la gestion des membres où elles avaient atterri par accident.
  const { ferme, role } = useFermeActive();

  const [constantes, setConstantes] = useConstantes();
  const [conditions] = useConditions();
  const [banque, setBanque] = useBanque();
  const [minuteurs, setMinuteurs] = useMinuteurs();

  const [calPlante, setCalPlante] = useState<PlanteId>("chanvre");
  const [calGenome, setCalGenome] = useState("GGGYYY");
  const [calMinutes, setCalMinutes] = useState(95);

  const genome = useMemo(
    () =>
      calGenome.toUpperCase().replace(/[^GYHWX]/g, "").padEnd(6, "X").slice(0, 6).split("") as Genome,
    [calGenome]
  );

  const prevision = useMemo(
    () => calculerCroissance(calPlante, genome, conditions, constantes).minutesJusquMur,
    [calPlante, genome, conditions, constantes]
  );

  const nbG = genome.filter((l) => l === "G").length;

  // --- Calibrage du rendement -------------------------------------------------
  const [renPlante, setRenPlante] = useState<PlanteId>("chanvre");
  const [renGenome, setRenGenome] = useState("GGGYYY");
  const [renMesure, setRenMesure] = useState(18);

  const genomeRen = useMemo(
    () => renGenome.toUpperCase().replace(/[^GYHWX]/g, "").padEnd(6, "X").slice(0, 6).split("") as Genome,
    [renGenome]
  );
  const nbY = genomeRen.filter((l) => l === "Y").length;

  const previsionRendement = useMemo(
    () =>
      calculerRendement(renPlante, genomeRen, conditions, constantes, {
        plantsParBac: 1,
        bonusTheRecolte: 0,
        minutesCycle: 1,
      }).parPlant,
    [renPlante, genomeRen, conditions, constantes]
  );

  /** Isole facteurY à partir d'une récolte réellement observée. */
  function calibrerRendement() {
    if (nbY === 0 || renMesure <= 0) return;
    // Rendement du même plant avec facteurY à zéro : c'est le terme constant.
    const temoin = calculerRendement(renPlante, genomeRen, conditions, { ...constantes, facteurY: 0 }, {
      plantsParBac: 1,
      bonusTheRecolte: 0,
      minutesCycle: 1,
    }).parPlant;
    if (temoin <= 0) return;
    const f = (renMesure / temoin - 1) / nbY;
    if (!isFinite(f) || f < 0) return;
    setConstantes({ ...constantes, facteurY: Math.round(f * 1000) / 1000 });
  }

  /** Isole la réduction par gène G à partir d'un cycle réellement chronométré. */
  function calibrer() {
    if (calMinutes <= 0 || nbG === 0) return;
    // Sans aucun gène G, le cycle vaudrait « temoin ». On en déduit la réduction
    // géométrique : mesure = temoin × (1 − r)^nbG.
    const temoin = calculerCroissance(calPlante, genome, conditions, {
      ...constantes,
      facteurG: 0,
    }).minutesJusquMur;
    if (temoin <= 0) return;
    const r = 1 - Math.pow(calMinutes / temoin, 1 / nbG);
    if (!isFinite(r) || r < 0 || r >= 0.9) return;
    setConstantes({ ...constantes, facteurG: Math.round(r * 1000) / 1000 });
  }

  return (
    <Page>
      <EnTetePage
        titre="Réglages"
        intro="Les durées et les rendements sont un modèle approché. Mesure un cycle en jeu, corrige ici, tout le site suit."
      />

      <section className="space-y-4 panneau">
        <h2 className="titre text-xl">Caler sur un cycle mesuré</h2>
        <p className="text-[13px] text-feuille-400">
          Chronomètre une pousse de la plantation au stade Mûr, puis rentre le résultat.
        </p>

        <Champ label="Plante">
          <Choix
            valeur={calPlante}
            onChange={setCalPlante}
            options={PLANTES.map((p) => ({
              label: p.nom,
              valeur: p.id,
              icone: <IconePlante plante={p.id} taille={16} />,
            }))}
          />
        </Champ>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-32">
            <Champ label="Gènes">
              <input
                className="champ font-mono uppercase"
                value={calGenome}
                onChange={(e) => setCalGenome(e.target.value)}
              />
            </Champ>
          </div>
          <div className="w-36">
            <Champ label="Mesuré (minutes)">
              <input
                type="number"
                min={1}
                className="champ"
                value={calMinutes}
                onChange={(e) => setCalMinutes(Math.max(1, Number(e.target.value)))}
              />
            </Champ>
          </div>
          <button type="button" className="bouton bouton-primaire" onClick={calibrer} disabled={nbG === 0}>
            Caler le modèle
          </button>
        </div>

        <p className="border-t border-white/10 pt-3 font-mono text-[13px] text-feuille-400">
          prévision actuelle <span className="text-feuille-100">{formatDuree(prevision)}</span> · ta mesure{" "}
          <span className="text-lampe-chaud">{formatDuree(calMinutes)}</span>
        </p>

        {nbG === 0 && (
          <Note ton="alerte">Il faut au moins un gène G pour en déduire le coefficient.</Note>
        )}
      </section>

      <section className="mt-6 space-y-4 panneau">
        <h2 className="titre text-xl">Caler sur une récolte mesurée</h2>
        <p className="text-[13px] text-feuille-400">
          Récolte un plant seul, sans thé de récolte, et compte ce qu&apos;il donne.
        </p>

        <Champ label="Plante">
          <Choix
            valeur={renPlante}
            onChange={setRenPlante}
            options={PLANTES.map((p) => ({
              label: p.nom,
              valeur: p.id,
              icone: <IconePlante plante={p.id} taille={16} />,
            }))}
          />
        </Champ>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-32">
            <Champ label="Gènes">
              <input
                className="champ font-mono uppercase"
                value={renGenome}
                onChange={(e) => setRenGenome(e.target.value)}
              />
            </Champ>
          </div>
          <div className="w-40">
            <Champ label={`Récolté (${PLANTE_PAR_ID[renPlante].ressource})`}>
              <input
                type="number"
                min={0}
                step="0.5"
                className="champ"
                value={renMesure}
                onChange={(e) => setRenMesure(Math.max(0, Number(e.target.value)))}
              />
            </Champ>
          </div>
          <button type="button" className="bouton bouton-primaire" onClick={calibrerRendement} disabled={nbY === 0}>
            Caler le rendement
          </button>
        </div>

        <p className="border-t border-white/10 pt-3 font-mono text-[13px] text-feuille-400">
          prévision actuelle <span className="text-feuille-100">{formatNombre(previsionRendement)}</span> · ta
          mesure <span className="text-lampe-chaud">{formatNombre(renMesure)}</span>
        </p>

        {nbY === 0 && <Note ton="alerte">Il faut au moins un gène Y pour en déduire le coefficient.</Note>}
      </section>

      <div className="mt-10">
        <Details titre="Coefficients bruts">
          <div className="space-y-5">
            {CURSEURS.map((c) => (
              <div key={c.cle}>
                <label className="flex items-baseline justify-between" htmlFor={c.cle}>
                  <span className="eyebrow">{c.label}</span>
                  <span className="font-mono text-sm text-feuille-100">
                    {constantes[c.cle].toFixed(2)}
                    {constantes[c.cle] !== CONSTANTES_DEFAUT[c.cle] && (
                      <span className="ml-2 text-[11px] text-lampe-chaud">modifié</span>
                    )}
                  </span>
                </label>
                <input
                  id={c.cle}
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.pas}
                  value={constantes[c.cle]}
                  onChange={(e) => setConstantes({ ...constantes, [c.cle]: Number(e.target.value) })}
                  className="mt-1.5 w-full"
                />
                <p className="mt-1 text-[12px] text-feuille-400">{c.aide}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="bouton mt-5"
            onClick={() => setConstantes(CONSTANTES_DEFAUT)}
          >
            Revenir aux valeurs par défaut
          </button>
        </Details>

        {ferme && (
          <ReglageDiscord fermeId={ferme.id} estProprietaire={role === "proprietaire"} />
        )}

        <Details titre="Tes données">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            {banque.length} gènes{banque.length > 1 ? "s" : ""} en banque, {minuteurs.length} minuteur
            {minuteurs.length > 1 ? "s" : ""}. Tout est dans le stockage de ce navigateur : rien n&apos;est
            envoyé nulle part, et rien ne suit si tu changes de machine.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="bouton"
              onClick={() => {
                const blob = new Blob([JSON.stringify({ banque, minuteurs, constantes }, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "rusticulture-sauvegarde.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Exporter en JSON
            </button>
            <button
              type="button"
              className="bouton"
              onClick={() => confirm("Vider la banque de graines ?") && setBanque([])}
            >
              Vider la banque
            </button>
            <button
              type="button"
              className="bouton"
              onClick={() => confirm("Supprimer tous les minuteurs ?") && setMinuteurs([])}
            >
              Supprimer les minuteurs
            </button>
          </div>
        </Details>

        <Details titre="Ce qui est sûr et ce qui ne l'est pas">
          <ul className="space-y-2 text-[14px] leading-relaxed text-feuille-200">
            <li>
              <span className="text-gene-g">Fiable</span> — les poids de croisement, la règle du dépassement
              strict, les recettes des thés principaux, les paliers 4 pour 1, les coûts de raid.
            </li>
            <li>
              <span className="text-mur">Approché</span> — les durées de pousse, la découpe en stades et les
              rendements par plant. Les sources communautaires se contredisent franchement là-dessus. Le
              modèle par défaut retient les repères les plus souvent cités : environ 3 h pour une graine sans
              gène G, et une réduction dégressive d&apos;environ 17 % par G.
            </li>
            <li>
              <span className="text-mur">À vérifier</span> — les recettes des thés réchauffant, rafraîchissant,
              de récolte et de qualité d&apos;artisanat divergent entre les sources.
            </li>
          </ul>
        </Details>
      </div>
      <VoirAussi
        liens={[
          { href: "/aide", label: "Aide", detail: "Le pas-à-pas pour brancher Discord." },
          { href: "/rendement", label: "Rendement", detail: "Vérifier l'effet du calibrage sur les durées." },
        ]}
      />

    </Page>
  );
}
