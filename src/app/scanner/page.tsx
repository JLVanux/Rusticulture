"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditeurGenes } from "@/components/Genes";
import { IconePlante } from "@/components/IconePlante";
import { Champ, Choix, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { GENE_LETTERS, PLANTES, type Genome, type PlanteId } from "@/data/game";
import { formatGenome } from "@/lib/crossbreed";
import { useGraines } from "@/lib/graines";
import { idUnique, useStockage } from "@/lib/storage";
import { SourceGrainesBandeau } from "@/components/SourceGraines";
import {
  apprendrePalette,
  lireParCouleur,
  lireParOcr,
  paletteComplete,
  type Palette,
  type Zone,
} from "@/lib/scan";

type Mode = "ocr" | "couleur";

interface Trouvaille {
  id: string;
  genome: Genome;
  vu: number;
  doute?: boolean;
}

const SEUIL_DOUTE = 0.08;

export default function PageScanner() {
  const { source, modifiable, ferme, nbLocal, enAttente, ajouterLot, transfererDepuisLocal } =
    useGraines();
  const [zone, setZone] = useStockage<Zone | null>("zone-scan", null);
  const [palette, setPalette] = useStockage<Palette>("palette-genes", {});
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const [mode, setMode] = useState<Mode>("ocr");
  const [segmentation, setSegmentation] = useState<"ligne" | "bloc">("ligne");
  const [partage, setPartage] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [auto, setAuto] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [trouvailles, setTrouvailles] = useState<Trouvaille[]>([]);
  const [brut, setBrut] = useState("");
  const [verite, setVerite] = useState<Genome>(["G", "Y", "H", "W", "X", "G"]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const [selection, setSelection] = useState<Zone | null>(null);
  const [trace, setTrace] = useState(false);

  const arreter = useCallback(() => {
    fluxRef.current?.getTracks().forEach((t) => t.stop());
    fluxRef.current = null;
    setPartage(false);
    setAuto(false);
  }, []);

  useEffect(() => () => arreter(), [arreter]);

  async function demarrer() {
    setErreur(null);
    try {
      const flux = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 10 }, audio: false });
      fluxRef.current = flux;
      flux.getVideoTracks()[0]?.addEventListener("ended", arreter);
      if (videoRef.current) {
        videoRef.current.srcObject = flux;
        await videoRef.current.play();
      }
      setPartage(true);
    } catch (e) {
      setErreur(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Partage refusé. Relance et choisis la fenêtre de Rust."
          : "Ton navigateur n'autorise pas le partage d'écran. Firefox, Chrome et Edge le gèrent."
      );
    }
  }

  /** Coordonnées d'un pointeur, souris ou doigt, ramenées aux pixels de la vidéo. */
  function pointVideo(clientX: number, clientY: number) {
    const video = videoRef.current;
    const boite = conteneurRef.current?.getBoundingClientRect();
    if (!video || !boite || !video.videoWidth) return null;
    const echelle = video.videoWidth / boite.width;
    return { x: (clientX - boite.left) * echelle, y: (clientY - boite.top) * echelle };
  }

  function debutTrace(clientX: number, clientY: number) {
    const p = pointVideo(clientX, clientY);
    if (!p) return;
    setTrace(true);
    setSelection({ x: p.x, y: p.y, largeur: 0, hauteur: 0 });
  }

  function pendantTrace(clientX: number, clientY: number) {
    if (!trace || !selection) return;
    const p = pointVideo(clientX, clientY);
    if (!p) return;
    setSelection({
      x: Math.min(selection.x, p.x),
      y: Math.min(selection.y, p.y),
      largeur: Math.abs(p.x - selection.x),
      hauteur: Math.abs(p.y - selection.y),
    });
  }

  function finTrace() {
    setTrace(false);
    if (selection && selection.largeur > 12 && selection.hauteur > 8) setZone(selection);
    setSelection(null);
  }

  function empiler(genomes: Genome[], doute = false) {
    if (genomes.length === 0) return;
    setTrouvailles((prec) => {
      const copie = [...prec];
      for (const g of genomes) {
        const code = formatGenome(g);
        const existe = copie.find((t) => formatGenome(t.genome) === code);
        if (existe) existe.vu += 1;
        else copie.unshift({ id: idUnique(), genome: g, vu: 1, doute });
      }
      return copie.slice(0, 24);
    });
  }

  const scanner = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !zone || !video.videoWidth) return;
    setOccupe(true);
    setErreur(null);
    try {
      if (mode === "couleur") {
        const res = lireParCouleur(video, zone, palette);
        if (!res) {
          setErreur("La palette n'est pas encore apprise. Enseigne-lui au moins une lecture connue.");
          return;
        }
        setBrut(`${formatGenome(res.genome)} · écart max ${res.ecartMax.toFixed(3)}`);
        empiler([res.genome], res.ecartMax > SEUIL_DOUTE);
      } else {
        const res = await lireParOcr(video, zone, segmentation);
        setBrut(res.texte.replace(/\s+/g, "") || "(vide)");
        empiler(res.genomes);
      }
    } catch {
      setErreur("La lecture a échoué. Au premier scan, le moteur se télécharge — vérifie ta connexion.");
    } finally {
      setOccupe(false);
    }
  }, [zone, mode, palette, segmentation]);

  useEffect(() => {
    if (!auto || !zone) return;
    const t = setInterval(() => void scanner(), mode === "couleur" ? 1200 : 2500);
    return () => clearInterval(t);
  }, [auto, zone, scanner, mode]);

  function apprendre() {
    const video = videoRef.current;
    if (!video || !zone) return;
    const suivante = apprendrePalette(video, zone, verite, palette);
    if (!suivante) {
      setErreur("Impossible d'échantillonner la zone.");
      return;
    }
    setPalette(suivante);
    setErreur(null);
  }

  async function ajouter(t: Trouvaille) {
    await ajouterLot([t.genome], plante, "scan");
    setTrouvailles((prec) => prec.filter((x) => x.id !== t.id));
  }

  /** Tout ajouter en un seul envoi plutôt qu'un par graine. */
  async function ajouterTout() {
    const lot = trouvailles.map((t) => t.genome);
    if (lot.length === 0) return;
    await ajouterLot(lot, plante, "scan");
    setTrouvailles([]);
  }

  const [partageDisponible, setPartageDisponible] = useState(true);
  useEffect(() => {
    setPartageDisponible(
      typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function"
    );
  }, []);

  const lettresApprises = GENE_LETTERS.filter((l) => palette[l]);
  const prete = paletteComplete(palette);

  return (
    <Page large>
      <EnTetePage
        titre="Scanner l'écran"
        intro="Partage la fenêtre de Rust, encadre une fois la zone des gènes, et le site les lit."
      />

      <SourceGrainesBandeau
        source={source}
        nomFerme={ferme?.nom}
        nbLocal={nbLocal}
        enAttente={enAttente}
        modifiable={modifiable}
        onTransferer={transfererDepuisLocal}
      />

      {erreur && (
        <div className="mb-5">
          <Note ton="alerte">{erreur}</Note>
        </div>
      )}

      {!partage ? (
        <div className="rounded-lg border border-white/10 bg-nuit-800 p-8 text-center">
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-feuille-200">
            Rien ne sort de ton navigateur. L&apos;image est analysée sur ta machine, aucune capture
            n&apos;est envoyée nulle part.
          </p>
          {partageDisponible ? (
            <>
              <button type="button" className="bouton bouton-primaire mt-5" onClick={demarrer}>
                Partager mon écran
              </button>
              <p className="mt-3 font-mono text-[12px] text-feuille-400">
                Lance Rust en fenêtré sans bordure — le plein écran exclusif se capture mal, voire pas du tout.
              </p>
            </>
          ) : (
            <p className="mx-auto mt-5 max-w-md rounded border-l-2 border-mur py-2 pl-3 text-left text-[14px] leading-relaxed text-feuille-200">
              Ton navigateur ne sait pas partager l&apos;écran. C&apos;est le cas de tous les navigateurs
              mobiles : cette page n&apos;a de sens que sur l&apos;ordinateur où tourne Rust. Sur téléphone,
              saisis tes gènes à la main depuis Mes graines.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div
              ref={conteneurRef}
              className="relative select-none overflow-hidden rounded-lg border border-white/10 bg-black"
              onMouseDown={(e) => debutTrace(e.clientX, e.clientY)}
              onMouseMove={(e) => pendantTrace(e.clientX, e.clientY)}
              onMouseUp={finTrace}
              onMouseLeave={() => trace && finTrace()}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) debutTrace(t.clientX, t.clientY);
              }}
              onTouchMove={(e) => {
                const t = e.touches[0];
                if (!t) return;
                // Sans ça, le doigt fait défiler la page au lieu de tracer.
                e.preventDefault();
                pendantTrace(t.clientX, t.clientY);
              }}
              onTouchEnd={finTrace}
              style={{ cursor: "crosshair", touchAction: "none" }}
            >
              <video ref={videoRef} className="block w-full" muted playsInline />
              <Cadre zone={selection ?? zone} video={videoRef.current} conteneur={conteneurRef.current} />
              {zone && mode === "couleur" && (
                <Colonnes zone={selection ?? zone} video={videoRef.current} conteneur={conteneurRef.current} />
              )}
            </div>
            <p className="mt-2 text-[13px] text-feuille-400">
              {zone
                ? "Zone enregistrée. Retrace un rectangle pour la déplacer."
                : "Trace un rectangle autour des six lettres, au plus serré possible."}
            </p>
          </div>

          <Champ label="Méthode de lecture">
            <Choix
              valeur={mode}
              onChange={setMode}
              options={[
                { label: "Reconnaissance de texte", valeur: "ocr" as const },
                { label: "Couleur", valeur: "couleur" as const },
              ]}
            />
          </Champ>

          {mode === "ocr" ? (
            <Champ label="Découpage" aide="Une ligne si tu inspectes une seule graine, bloc si plusieurs sont visibles.">
              <Choix
                valeur={segmentation}
                onChange={setSegmentation}
                options={[
                  { label: "Une ligne", valeur: "ligne" as const },
                  { label: "Bloc", valeur: "bloc" as const },
                ]}
              />
            </Champ>
          ) : (
            <div className="verre rampe p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="titre text-lg">Apprendre la palette</h2>
                <span className="font-mono text-[12px] text-feuille-400">
                  {lettresApprises.length}/5 lettres connues
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-feuille-400">
                Affiche en jeu une graine dont tu connais les gènes, saisis-les ci-dessous, puis apprends. Le
                site retient la couleur de chaque lettre. Recommence avec d&apos;autres graines jusqu&apos;à
                avoir les cinq.
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <Champ label="Ce qui est affiché à l'écran">
                  <EditeurGenes genome={verite} onChange={setVerite} taille="md" />
                </Champ>
                <button type="button" className="bouton" onClick={apprendre} disabled={!zone}>
                  Apprendre
                </button>
                {lettresApprises.length > 0 && (
                  <button type="button" className="bouton" onClick={() => setPalette({})}>
                    Oublier
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {GENE_LETTERS.map((l) => (
                  <span
                    key={l}
                    className={`puce ${
                      palette[l] ? "border-gene-g/40 text-gene-g" : "border-nuit-500 text-feuille-400"
                    }`}
                  >
                    {l} {palette[l] ? "appris" : "manquant"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="bouton bouton-primaire"
              onClick={() => void scanner()}
              disabled={!zone || occupe || (mode === "couleur" && lettresApprises.length === 0)}
            >
              {occupe ? "Lecture…" : "Scanner maintenant"}
            </button>
            <label className="flex items-center gap-2 text-[14px] text-feuille-200">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                disabled={!zone || (mode === "couleur" && lettresApprises.length === 0)}
                className="h-4 w-4 accent-lampe"
              />
              Relire en continu
            </label>
            <button type="button" className="bouton ml-auto" onClick={arreter}>
              Arrêter le partage
            </button>
          </div>

          {mode === "couleur" && !prete && lettresApprises.length > 0 && (
            <Note ton="alerte">
              Il manque {5 - lettresApprises.length} lettre{5 - lettresApprises.length > 1 ? "s" : ""} à la
              palette. Tant qu&apos;une lettre est inconnue, le site lui substituera la plus proche parmi
              celles qu&apos;il connaît — donc une erreur silencieuse.
            </Note>
          )}

          <Champ label="Ces graines sont du">
            <Choix
              valeur={plante}
              onChange={setPlante}
              options={PLANTES.map((p) => ({
              label: p.nom,
              valeur: p.id,
              icone: <IconePlante plante={p.id} taille={16} />,
            }))}
            />
          </Champ>
        </div>
      )}

      {trouvailles.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="titre text-xl">
              Lu à l&apos;écran{" "}
              <span className="font-mono text-sm font-normal text-feuille-400">{trouvailles.length}</span>
            </h2>
            <div className="flex gap-2">
              <button type="button" className="bouton" onClick={() => setTrouvailles([])}>
                Effacer
              </button>
              <button type="button" className="bouton bouton-primaire" onClick={() => void ajouterTout()}>
                Tout ajouter
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {trouvailles.map((t) => (
              <li
                key={t.id}
                className={`flex flex-wrap items-center gap-3 rounded border p-2.5 ${
                  t.doute ? "border-mur/50 bg-mur/5" : "border-white/10 bg-nuit-800"
                }`}
              >
                <EditeurGenes
                  genome={t.genome}
                  onChange={(g) =>
                    setTrouvailles((p) => p.map((x) => (x.id === t.id ? { ...x, genome: g } : x)))
                  }
                  taille="md"
                />
                {t.vu > 1 && <span className="puce border-gene-g/40 text-gene-g">lu {t.vu}×</span>}
                {t.doute && <span className="puce border-mur/50 text-mur">à vérifier</span>}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    className="font-mono text-[11px] uppercase tracking-wider text-feuille-400 hover:text-gene-w"
                    onClick={() => setTrouvailles((p) => p.filter((x) => x.id !== t.id))}
                  >
                    Jeter
                  </button>
                  <button type="button" className="bouton" onClick={() => void ajouter(t)}>
                    Ajouter
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <Details titre="Quelle méthode choisir">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            <span className="text-feuille-100">Reconnaissance de texte</span> — marche tout de suite, sans rien
            configurer. Elle reconnaît la forme des lettres, en s&apos;interdisant tout ce qui n&apos;est pas
            G, Y, H, W ou X. Bridée à cinq caractères possibles au lieu de vingt-six, elle se trompe beaucoup
            moins qu&apos;un OCR ordinaire — mais elle reste sensible à la résolution et au lissage des polices.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            <span className="text-feuille-100">Couleur</span> — demande cinq minutes de mise en route, puis ne se
            trompe quasiment plus. Chaque gène s&apos;affiche dans une teinte distincte en jeu : le site découpe
            la zone en six colonnes et compare la teinte dominante de chacune à ce que tu lui as enseigné. Pas
            de téléchargement, lecture instantanée. Si la première méthode te déçoit, bascule ici.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-feuille-400">
            Pourquoi te faire enseigner les couleurs plutôt que de les coder en dur : je n&apos;ai pas accès au
            jeu, je ne peux donc pas connaître la palette exacte, et elle peut changer d&apos;un patch à
            l&apos;autre. Te la faire apprendre une fois est plus fiable que de la deviner.
          </p>
        </Details>

        <Details titre="Obtenir une lecture propre">
          <ol className="space-y-3 text-[14px] leading-relaxed text-feuille-200">
            <li>
              <span className="text-feuille-100">Rust en fenêtré sans bordure.</span> Le plein écran exclusif est
              souvent incapturable.
            </li>
            <li>
              <span className="text-feuille-100">Partage la fenêtre, pas l&apos;écran entier.</span> Le partage
              d&apos;écran complet redimensionne l&apos;image et brouille les petites lettres.
            </li>
            <li>
              <span className="text-feuille-100">Encadre au plus serré.</span> Un rectangle qui contient du décor
              en plus fait chuter la précision. En mode couleur c&apos;est critique : les six colonnes sont
              découpées à parts égales dans le rectangle.
            </li>
            <li>
              <span className="text-feuille-100">Le premier scan en mode texte est lent.</span> Le moteur (environ
              3 Mo) se télécharge à ce moment-là, puis reste en cache.
            </li>
          </ol>
          {brut && (
            <p className="mt-4 font-mono text-[12px] text-feuille-400">
              Dernière lecture brute : <span className="text-feuille-200">{brut}</span>
            </p>
          )}
        </Details>

        <Details titre="Ce que le scanner ne fait pas">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Il lit des lettres ou des couleurs, il ne comprend pas l&apos;interface de Rust. Il ne sait pas de
            quelle plante il s&apos;agit — c&apos;est le sélecteur qui le lui dit — et il ne distingue pas une
            graine d&apos;une bouture. Vois-le comme une saisie assistée qui t&apos;évite de taper, pas comme
            une source de vérité. La confirmation reste manuelle, exprès.
          </p>
        </Details>
      </div>
    </Page>
  );
}

function echelleDe(video: HTMLVideoElement | null, conteneur: HTMLDivElement | null) {
  if (!video?.videoWidth || !conteneur) return null;
  return conteneur.getBoundingClientRect().width / video.videoWidth;
}

function Cadre({
  zone,
  video,
  conteneur,
}: {
  zone: Zone | null;
  video: HTMLVideoElement | null;
  conteneur: HTMLDivElement | null;
}) {
  const e = echelleDe(video, conteneur);
  if (!zone || e === null) return null;
  return (
    <div
      className="pointer-events-none absolute border-2 border-lampe bg-lampe/10"
      style={{ left: zone.x * e, top: zone.y * e, width: zone.largeur * e, height: zone.hauteur * e }}
    />
  );
}

/** Montre où tombent les six colonnes : indispensable pour cadrer en mode couleur. */
function Colonnes({
  zone,
  video,
  conteneur,
}: {
  zone: Zone | null;
  video: HTMLVideoElement | null;
  conteneur: HTMLDivElement | null;
}) {
  const e = echelleDe(video, conteneur);
  if (!zone || e === null) return null;
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="pointer-events-none absolute w-px bg-lampe-chaud/70"
          style={{
            left: (zone.x + (zone.largeur * i) / 6) * e,
            top: zone.y * e,
            height: zone.hauteur * e,
          }}
        />
      ))}
    </>
  );
}
