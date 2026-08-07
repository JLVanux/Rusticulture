"use client";

import { useEffect, useMemo, useState } from "react";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { Champ, Choix, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { PLANTES, PLANTE_PAR_ID, type Genome, type PlanteId } from "@/data/game";
import { calculerCroissance, formatDuree } from "@/lib/model";
import { useConditions, useConstantes, useMinuteurs, type Minuteur } from "@/lib/hooks";
import { idUnique } from "@/lib/storage";

function compte(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function PageMinuteurs() {
  const [minuteurs, setMinuteurs] = useMinuteurs();
  const [constantes] = useConstantes();
  const [conditions] = useConditions();
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [genome, setGenome] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const [nom, setNom] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "indisponible">("default");

  useEffect(() => {
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("indisponible");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    for (const m of minuteurs) {
      const ecoule = (maintenant - m.debut) / 60000;
      if (!m.alerteCroisementFaite && ecoule >= m.minutesCroisement) {
        new Notification("Gènes recalculés", {
          body: `${m.nom} — va voir son résultat, tu peux le bouturer.`,
          tag: `${m.id}-c`,
        });
        setMinuteurs((p) => p.map((x) => (x.id === m.id ? { ...x, alerteCroisementFaite: true } : x)));
      } else if (!m.alerteMurFaite && ecoule >= m.minutesMur) {
        new Notification("Récolte prête", { body: `${m.nom} est mûr.`, tag: `${m.id}-m` });
        setMinuteurs((p) => p.map((x) => (x.id === m.id ? { ...x, alerteMurFaite: true } : x)));
      }
    }
  }, [maintenant, minuteurs, permission, setMinuteurs]);

  const apercu = useMemo(
    () => calculerCroissance(plante, genome, conditions, constantes),
    [plante, genome, conditions, constantes]
  );

  function lancer() {
    const c = calculerCroissance(plante, genome, conditions, constantes);
    const m: Minuteur = {
      id: idUnique(),
      nom: nom.trim() || `${PLANTE_PAR_ID[plante].nom} ${genome.join("")}`,
      plante,
      genome,
      debut: Date.now(),
      minutesCroisement: c.minutesAvantCroisement,
      minutesMur: c.minutesJusquMur,
      minutesFin: c.minutesAvantDeclin,
    };
    setMinuteurs((p) => [...p, m]);
    setNom("");
  }

  const tries = useMemo(
    () => [...minuteurs].sort((a, b) => a.debut + a.minutesMur * 60000 - (b.debut + b.minutesMur * 60000)),
    [minuteurs]
  );

  return (
    <Page>
      <EnTetePage
        titre="Minuteurs"
        intro="Tu plantes, tu lances, tu pars farmer. Le site te prévient quand les gènes sont recalculés, puis à la récolte."
      />

      {permission === "default" && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-lamp/40 bg-lamp/8 p-4">
          <span className="flex-1 text-[14px] text-moss-200">
            Sans autorisation, tu dois revenir sur l&apos;onglet pour voir où en sont tes plants.
          </span>
          <button
            type="button"
            className="bouton bouton-primaire"
            onClick={() => Notification.requestPermission().then(setPermission)}
          >
            Autoriser les notifications
          </button>
        </div>
      )}

      {/* Nouveau minuteur, en haut : c'est l'action principale */}
      <section className="space-y-4 rounded-lg border border-soil-600 bg-soil-850 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <Champ label="Gènes">
            <EditeurGenes genome={genome} onChange={setGenome} taille="md" />
          </Champ>
          <div className="min-w-[10rem] flex-1">
            <Champ label="Repère (facultatif)">
              <input
                className="champ"
                placeholder="bac du fond"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </Champ>
          </div>
        </div>

        <Champ label="Plante">
          <Choix valeur={plante} onChange={setPlante} options={PLANTES.map((p) => ({ label: p.nom, valeur: p.id }))} />
        </Champ>

        <div className="flex flex-wrap items-center gap-4 border-t border-soil-600 pt-4">
          <button type="button" className="bouton bouton-primaire" onClick={lancer}>
            Lancer le minuteur
          </button>
          <span className="font-mono text-[13px] text-moss-400">
            croisement à {formatDuree(apercu.minutesAvantCroisement)} · récolte à{" "}
            {formatDuree(apercu.minutesJusquMur)}
          </span>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        {tries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-soil-600 p-10 text-center">
            <p className="text-moss-200">Aucun minuteur en cours.</p>
          </div>
        ) : (
          tries.map((m) => {
            const ecoule = (maintenant - m.debut) / 60000;
            const avantC = m.minutesCroisement - ecoule;
            const avantM = m.minutesMur - ecoule;
            const progression = Math.min(1, Math.max(0, ecoule / m.minutesFin));
            const enCroisement = ecoule >= m.minutesCroisement && ecoule < m.minutesMur;
            const mur = ecoule >= m.minutesMur && ecoule < m.minutesFin;
            const mort = ecoule >= m.minutesFin;

            return (
              <article
                key={m.id}
                className={`rounded-lg border p-4 ${
                  enCroisement
                    ? "border-lamp bg-lamp/8"
                    : mur
                      ? "border-ripe/60 bg-ripe/8"
                      : mort
                        ? "border-soil-600 opacity-45"
                        : "border-soil-600 bg-soil-850"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <ChaineGenes genome={m.genome} taille="sm" />
                  <span className="font-display text-lg font-semibold uppercase tracking-wide text-moss-100">
                    {m.nom}
                  </span>
                  <button
                    type="button"
                    className="ml-auto font-mono text-[11px] uppercase tracking-wider text-moss-400 hover:text-gene-w"
                    onClick={() => setMinuteurs((p) => p.filter((x) => x.id !== m.id))}
                  >
                    Supprimer
                  </button>
                </div>

                <div className="mt-3 flex items-baseline gap-3">
                  <span
                    className={`font-mono text-3xl font-bold ${
                      enCroisement ? "text-lamp-glow" : mur ? "text-ripe" : "text-moss-100"
                    }`}
                  >
                    {enCroisement
                      ? "À INSPECTER"
                      : mur
                        ? "RÉCOLTE"
                        : mort
                          ? "MORT"
                          : compte(avantC * 60000)}
                  </span>
                  {!enCroisement && !mur && !mort && (
                    <span className="text-[13px] text-moss-400">avant le recalcul des gènes</span>
                  )}
                </div>

                <div className="relative mt-3 h-2 w-full overflow-hidden rounded-sm bg-soil-700">
                  <span
                    className={`block h-full ${mort ? "bg-soil-500" : mur ? "bg-ripe" : "bg-lamp"}`}
                    style={{ width: `${progression * 100}%` }}
                  />
                  <span
                    className="absolute top-0 h-full w-px bg-moss-100/70"
                    style={{ left: `${(m.minutesCroisement / m.minutesFin) * 100}%` }}
                    aria-hidden
                  />
                  <span
                    className="absolute top-0 h-full w-px bg-moss-100/70"
                    style={{ left: `${(m.minutesMur / m.minutesFin) * 100}%` }}
                    aria-hidden
                  />
                </div>

                <p className="mt-2 font-mono text-[12px] text-moss-400">
                  récolte {avantM > 0 ? `dans ${compte(avantM * 60000)}` : "disponible"}
                </p>
              </article>
            );
          })
        )}
      </section>

      <div className="mt-10">
        <Details titre="Quand bouturer, exactement">
          <div className="space-y-3 text-[14px] leading-relaxed text-moss-200">
            <p>
              Les gènes sont recalculés au moment où le plant entre en stade Croisement. Avant ça, inutile de
              l&apos;inspecter : tu lirais ses gènes de départ, pas le résultat du croisement.
            </p>
            <p>
              Passé ce moment, tu as le temps. La plupart des sources s&apos;accordent à dire que le bouturage
              est possible dès le stade Jeune pousse et jusqu&apos;à ce que le plant dépérisse — le stade
              Croisement n&apos;est pas une porte qui se referme. Une bouture copie les six gènes à
              l&apos;identique, ce qui fige le résultat pour de bon.
            </p>
            <p className="text-moss-400">
              Quelques guides affirment l&apos;inverse : fenêtre étroite, ou bouturage possible seulement au
              stade Mûr. Le site retient la version majoritaire, mais dans le doute, bouture dès que le
              résultat t&apos;a plu plutôt que d&apos;attendre.
            </p>
          </div>
        </Details>

        <Details titre="Les minuteurs et l'onglet fermé">
          <p className="text-[14px] leading-relaxed text-moss-200">
            Ils continuent de tourner : tout est calculé depuis l&apos;heure de plantation, pas depuis un
            décompte en mémoire. Ferme l&apos;onglet, reviens deux heures plus tard, l&apos;affichage sera
            juste. En revanche les notifications, elles, ont besoin que l&apos;onglet reste ouvert quelque part.
          </p>
        </Details>
      </div>

      {permission === "denied" && (
        <div className="mt-6">
          <Note ton="alerte">
            Ton navigateur bloque les notifications pour ce site. Réautorise-les via le cadenas dans la barre
            d&apos;adresse.
          </Note>
        </div>
      )}
    </Page>
  );
}
