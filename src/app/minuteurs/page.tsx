"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlerteConditions } from "@/components/Conditions";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { IconePlante } from "@/components/IconePlante";
import { Champ, Choix, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { VoirAussi } from "@/components/VoirAussi";
import { PLANTES, PLANTE_PAR_ID, type Genome, type PlanteId } from "@/data/game";
import { calculerCroissance, formatDuree } from "@/lib/model";
import { useConditions, useConstantes } from "@/lib/hooks";
import { useTimers, type TimerUnifie } from "@/lib/timers";
import { useStockage } from "@/lib/storage";

function compte(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function PageMinuteurs() {
  const { timers, source, modifiable, ferme, charge, erreur, lancer, supprimer } = useTimers();
  const [constantes] = useConstantes();
  const [conditions] = useConditions();
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [genome, setGenome] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const [nom, setNom] = useState("");
  // Planté il y a combien de temps. Personne ne lance le minuteur au moment
  // exact où il plante : on y pense en revenant, un quart d'heure plus tard.
  const [ilYaMinutes, setIlYaMinutes] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | "indisponible">("default");

  // Ce qui a déjà été notifié appartient à cet appareil, pas à la ferme : si un
  // coéquipier a vu passer l'alerte, tu dois quand même la recevoir.
  const [notifies, setNotifies] = useStockage<string[]>("timers-notifies", []);

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
    for (const t of timers) {
      const ecoule = (maintenant - t.debut) / 60000;
      const cleCroisement = `${t.id}:croisement`;
      const cleMur = `${t.id}:mur`;

      if (ecoule >= t.minutesCroisement && !notifies.includes(cleCroisement)) {
        new Notification("Gènes recalculés", {
          body: `${t.nom} — va voir son résultat, tu peux le bouturer.`,
          tag: cleCroisement,
        });
        setNotifies((p) => [...p, cleCroisement]);
      } else if (ecoule >= t.minutesMur && !notifies.includes(cleMur)) {
        new Notification("Récolte prête", { body: `${t.nom} est mûr.`, tag: cleMur });
        setNotifies((p) => [...p, cleMur]);
      }
    }
  }, [maintenant, timers, permission, notifies, setNotifies]);

  const apercu = useMemo(
    () => calculerCroissance(plante, genome, conditions, constantes),
    [plante, genome, conditions, constantes]
  );

  function lancerMinuteur() {
    void lancer({
      nom: nom.trim() || `${PLANTE_PAR_ID[plante].nom} ${genome.join("")}`,
      plante,
      genome,
      debut: Date.now() - ilYaMinutes * 60_000,
      minutesCroisement: apercu.minutesAvantCroisement,
      minutesMur: apercu.minutesJusquMur,
      minutesFin: apercu.minutesAvantDeclin,
    });
    setNom("");
    setIlYaMinutes(0);
  }

  const tries = useMemo(
    () => [...timers].sort((a, b) => a.debut + a.minutesMur * 60000 - (b.debut + b.minutesMur * 60000)),
    [timers]
  );

  return (
    <Page>
      <EnTetePage
        titre="Minuteurs"
        intro="Tu plantes, tu lances, tu pars farmer. Le site te prévient quand les gènes sont recalculés, puis à la récolte."
      />

      {source === "ferme" ? (
        <p className="mb-6 rounded border-l-2 border-lampe py-2 pl-3 text-[13px] leading-relaxed text-feuille-400">
          Ces minuteurs appartiennent à la ferme <span className="text-feuille-100">{ferme?.nom}</span> : toute
          l&apos;équipe voit les mêmes décomptes.
          {!modifiable && <span className="text-mur"> Tu es en lecture seule.</span>}
        </p>
      ) : (
        <p className="mb-6 rounded border-l-2 border-nuit-500 py-2 pl-3 text-[13px] leading-relaxed text-feuille-400">
          Ces minuteurs sont dans <span className="text-feuille-100">ce navigateur</span>.{" "}
          <Link href="/ferme" className="text-lampe-chaud underline underline-offset-2">
            Rejoins une ferme
          </Link>{" "}
          pour que ton équipe les voie.
        </p>
      )}

      <AlerteConditions />

      {permission === "default" && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-lampe/40 bg-lampe/8 p-4">
          <span className="flex-1 text-[14px] text-feuille-200">
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

      {erreur && (
        <div className="mb-6">
          <Note ton="alerte">{erreur}</Note>
        </div>
      )}

      {modifiable && (
        <section className="space-y-4 panneau">
          <div className="flex flex-wrap items-end gap-4">
            <Champ label="Gènes">
              <EditeurGenes genome={genome} onChange={setGenome} taille="md" />
            </Champ>
            <div className="min-w-[12rem] flex-1">
              <Champ
                label="Quel bac ?"
                aide={
                  source === "ferme"
                    ? "C'est ce que ton équipe verra dans Discord. « Bac du fond » est plus utile que « Chanvre GGGYYY »."
                    : "Pour t'y retrouver si tu lances plusieurs minuteurs."
                }
              >
                <input
                  className="champ"
                  placeholder="bac du fond, serre 2 · bac 3…"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                />
              </Champ>
            </div>
          </div>

          <Champ label="Plante">
            <Choix valeur={plante} onChange={setPlante} options={PLANTES.map((p) => ({
              label: p.nom,
              valeur: p.id,
              icone: <IconePlante plante={p.id} taille={16} />,
            }))} />
          </Champ>

          <Champ
            label="Planté il y a"
            aide="Le décompte part de la plantation, pas du clic. Rattrape ici si tu y penses en retard."
          >
            <div className="rangee">
              {[0, 5, 15, 30, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setIlYaMinutes(m)}
                  className={`min-h-[2.5rem] rounded-sm border px-3.5 font-display text-[13px] font-semibold transition ${
                    ilYaMinutes === m
                      ? "border-rouille bg-rouille/15 text-braise"
                      : "border-trait text-cendre hover:border-trait-vif hover:text-craie"
                  }`}
                >
                  {m === 0 ? "à l'instant" : m < 60 ? `${m} min` : `${m / 60} h`}
                </button>
              ))}
              <input
                type="number"
                min={0}
                max={600}
                aria-label="Minutes écoulées depuis la plantation"
                className="champ w-24"
                value={ilYaMinutes}
                onChange={(e) => setIlYaMinutes(Math.max(0, Math.min(600, Number(e.target.value))))}
              />
            </div>
          </Champ>

          {ilYaMinutes >= apercu.minutesJusquMur ? (
            <Note ton="alerte">
              Avec ce décalage le plant serait déjà mûr — il l&apos;est à{" "}
              {formatDuree(apercu.minutesJusquMur)}. Va le récolter plutôt que de lancer un minuteur.
            </Note>
          ) : ilYaMinutes > 0 ? (
            <p className="font-mono text-[12px] text-cendre">
              {ilYaMinutes >= apercu.minutesAvantCroisement
                ? "Les gènes sont déjà recalculés : va inspecter le plant."
                : `Croisement dans ${formatDuree(apercu.minutesAvantCroisement - ilYaMinutes)}.`}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 border-t border-trait pt-4">
            <button type="button" className="bouton bouton-primaire" onClick={lancerMinuteur}>
              Lancer le minuteur
            </button>
            <span className="font-mono text-[13px] text-feuille-400">
              croisement à {formatDuree(apercu.minutesAvantCroisement)} · récolte à{" "}
              {formatDuree(apercu.minutesJusquMur)}
            </span>
          </div>
        </section>
      )}

      <section className="mt-8 space-y-3">
        {!charge ? (
          <p className="text-[15px] text-feuille-400">Chargement…</p>
        ) : tries.length === 0 ? (
          <div className="rounded-verre border border-dashed border-white/15 p-10 text-center">
            <p className="text-feuille-200">Aucun minuteur en cours.</p>
          </div>
        ) : (
          tries.map((t) => (
            <CarteTimer
              key={t.id}
              timer={t}
              maintenant={maintenant}
              modifiable={modifiable}
              onSupprimer={() => void supprimer(t.id, t.nom)}
            />
          ))
        )}
      </section>

      <div className="mt-10">
        <Details titre="Quand bouturer, exactement">
          <div className="space-y-3 text-[14px] leading-relaxed text-feuille-200">
            <p>
              Les gènes sont recalculés au moment où le plant entre en stade Croisement. Avant ça, inutile de
              l&apos;inspecter : tu lirais ses gènes de départ, pas le résultat du croisement.
            </p>
            <p>
              Passé ce moment, tu as le temps. La plupart des sources s&apos;accordent à dire que le bouturage
              est possible dès le stade Jeune pousse et jusqu&apos;à ce que le plant dépérisse — le stade
              Croisement n&apos;est pas une porte qui se referme.
            </p>
          </div>
        </Details>

        <Details titre="Les notifications et l'onglet fermé">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Les décomptes sont calculés depuis l&apos;heure de plantation : ferme l&apos;onglet, reviens deux
            heures plus tard, l&apos;affichage sera juste. Les notifications, elles, ont besoin qu&apos;un
            onglet reste ouvert quelque part — c&apos;est une limite du navigateur, pas du site.
          </p>
          {source === "ferme" && (
            <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
              Chaque appareil reçoit ses propres alertes. Si ton coéquipier a vu passer la sienne, tu recevras
              quand même la tienne.
            </p>
          )}
        </Details>
      </div>
      <VoirAussi
        liens={[
          { href: "/reglages", label: "Notifications Discord", detail: "Être prévenu sans garder le site ouvert." },
          { href: "/bac", label: "Gènes parfaits", detail: "Préparer le prochain croisement pendant que ça pousse." },
          { href: "/ferme", label: "Ma ferme", detail: "Voir où en est l'ensemble de la ferme." },
        ]}
      />

    </Page>
  );
}

function CarteTimer({
  timer,
  maintenant,
  modifiable,
  onSupprimer,
}: {
  timer: TimerUnifie;
  maintenant: number;
  modifiable: boolean;
  onSupprimer: () => void;
}) {
  const ecoule = (maintenant - timer.debut) / 60000;
  const avantC = timer.minutesCroisement - ecoule;
  const avantM = timer.minutesMur - ecoule;
  const progression = Math.min(1, Math.max(0, ecoule / timer.minutesFin));
  const enCroisement = ecoule >= timer.minutesCroisement && ecoule < timer.minutesMur;
  const mur = ecoule >= timer.minutesMur && ecoule < timer.minutesFin;
  const mort = ecoule >= timer.minutesFin;

  return (
    <article
      className={`rounded-lg border p-4 ${
        enCroisement
          ? "border-lampe bg-lampe/8"
          : mur
            ? "border-mur/60 bg-mur/8"
            : mort
              ? "border-white/10 opacity-45"
              : "border-white/10 bg-nuit-800"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {timer.genome && <ChaineGenes genome={timer.genome} taille="sm" />}
        <span className="font-display text-lg font-semibold uppercase tracking-wide text-feuille-100">
          {timer.nom}
        </span>
        {timer.parQui && (
          <span className="font-mono text-[12px] text-feuille-400">lancé par {timer.parQui}</span>
        )}
        {modifiable && (
          <button
            type="button"
            className="ml-auto font-mono text-[11px] uppercase tracking-wider text-feuille-400 hover:text-gene-w"
            onClick={onSupprimer}
          >
            Supprimer
          </button>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span
          className={`font-mono text-3xl font-bold ${
            enCroisement ? "text-lampe-chaud" : mur ? "text-mur" : "text-feuille-100"
          }`}
        >
          {enCroisement ? "À INSPECTER" : mur ? "RÉCOLTE" : mort ? "MORT" : compte(avantC * 60000)}
        </span>
        {!enCroisement && !mur && !mort && (
          <span className="text-[13px] text-feuille-400">avant le recalcul des gènes</span>
        )}
      </div>

      <div className="relative mt-3 h-2 w-full overflow-hidden rounded-sm bg-nuit-600">
        <span
          className={`block h-full ${mort ? "bg-nuit-500" : mur ? "bg-mur" : "bg-lampe"}`}
          style={{ width: `${progression * 100}%` }}
        />
        <span
          className="absolute top-0 h-full w-px bg-feuille-100/70"
          style={{ left: `${(timer.minutesCroisement / timer.minutesFin) * 100}%` }}
          aria-hidden
        />
        <span
          className="absolute top-0 h-full w-px bg-feuille-100/70"
          style={{ left: `${(timer.minutesMur / timer.minutesFin) * 100}%` }}
          aria-hidden
        />
      </div>

      <p className="mt-2 font-mono text-[12px] text-feuille-400">
        récolte {avantM > 0 ? `dans ${compte(avantM * 60000)}` : "disponible"}
      </p>
    </article>
  );
}
