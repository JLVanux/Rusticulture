"use client";

import { useEffect, useState } from "react";
import { Champ, Note } from "@/components/Ui";
import {
  extraireVideoId,
  lireQuantites,
  miniature,
  modifierBase,
  proposerBase,
  TAILLES,
  type Base,
  type TailleBase,
} from "@/lib/bases";
import { messageErreur } from "@/lib/supabase";

const DIFFICULTES = ["Très simple", "Simple", "Moyenne", "Exigeante", "Experte"];

export function FormulaireBase({
  admin,
  onAjout,
  base,
}: {
  admin: boolean;
  onAjout: () => void;
  /** Présent en relecture : on corrige une proposition au lieu d'en créer une. */
  base?: Base;
}) {
  const [lien, setLien] = useState(base?.videoId ?? "");
  const [titre, setTitre] = useState(base?.titre ?? "");
  const [auteur, setAuteur] = useState(base?.auteurVideo ?? "");
  const [description, setDescription] = useState(base?.description ?? "");
  const [q, setQ] = useState({
    grandsBacs: base?.grandsBacs ?? 0,
    petitsBacs: base?.petitsBacs ?? 0,
    pots: base?.pots ?? 0,
    poulaillers: base?.poulaillers ?? 0,
  });
  const [difficulte, setDifficulte] = useState(base?.difficulte ?? 3);
  const [taille, setTaille] = useState<TailleBase>(base?.taille ?? "duo_trio");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const videoId = extraireVideoId(lien);
  const [recherche, setRecherche] = useState(false);
  const [dernierId, setDernierId] = useState<string | null>(null);

  /**
   * Titre et chaîne remplis automatiquement dès qu'un lien valide est collé.
   *
   * On n'écrase jamais ce qui a été saisi à la main : la reconnaissance
   * automatique aide au premier remplissage, elle ne décide pas à la place de
   * celui qui propose.
   */
  useEffect(() => {
    if (!videoId || videoId === dernierId) return;
    setDernierId(videoId);
    setRecherche(true);

    void fetch(`/api/youtube?id=${videoId}`)
      .then((r) => r.json())
      .then((d: { trouve?: boolean; titre?: string | null; auteur?: string | null }) => {
        if (d.trouve) {
          if (d.titre) setTitre((prec) => prec.trim() || d.titre!);
          if (d.auteur) setAuteur((prec) => prec.trim() || d.auteur!);
        }
      })
      .catch(() => {
        // Silencieux : le formulaire reste remplissable à la main.
      })
      .finally(() => setRecherche(false));
  }, [videoId, dernierId]);

  /** La description peut annoncer le contenu : on s'en sert pour pré-remplir,
   *  jamais pour valider. */
  function relire(texte: string) {
    setDescription(texte);
    const lu = lireQuantites(texte);
    if (Object.values(lu).some((v) => v !== undefined)) {
      setQ((prec) => ({
        grandsBacs: lu.grandsBacs ?? prec.grandsBacs,
        petitsBacs: lu.petitsBacs ?? prec.petitsBacs,
        pots: lu.pots ?? prec.pots,
        poulaillers: lu.poulaillers ?? prec.poulaillers,
      }));
    }
  }

  async function envoyer() {
    if (!videoId || !titre.trim()) return;
    setOccupe(true);
    setErreur(null);
    try {
      if (base) {
        await modifierBase(base.id, {
          videoId,
          titre,
          auteurVideo: auteur,
          description,
          ...q,
          difficulte,
          taille,
        });
        setMessage("Modifications enregistrées.");
        onAjout();
        return;
      }

      await proposerBase(
        {
          videoId,
          titre,
          auteurVideo: auteur,
          description,
          ...q,
          difficulte,
          taille,
        },
        admin
      );
      setLien("");
      setTitre("");
      setAuteur("");
      setDescription("");
      setQ({ grandsBacs: 0, petitsBacs: 0, pots: 0, poulaillers: 0 });
      setMessage(admin ? "Base publiée." : "Proposition envoyée : elle sera relue avant publication.");
      onAjout();
    } catch (e) {
      const m = messageErreur(e);
      setErreur(
        m.includes("duplicate") || m.includes("unique")
          ? "Cette vidéo est déjà dans le répertoire."
          : m
      );
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="space-y-4">
      <Champ
        label="Lien YouTube"
        aide="Seul YouTube est accepté. Le site n'enregistre pas l'adresse mais l'identifiant de la vidéo."
      >
        <input
          className="champ font-mono text-[13px]"
          placeholder="https://www.youtube.com/watch?v=..."
          value={lien}
          onChange={(e) => setLien(e.target.value)}
        />
      </Champ>

      {lien.trim() && !videoId && (
        <Note ton="alerte">Ce lien n&apos;est pas une vidéo YouTube reconnaissable.</Note>
      )}

      {videoId && (
        <div className="flex flex-wrap items-center gap-4 rounded-sm border border-trait bg-case p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={miniature(videoId)}
            alt=""
            className="h-20 w-36 shrink-0 rounded-sm object-cover"
          />
          <p className="text-[13px] leading-snug text-cendre">
            {recherche
              ? "Récupération du titre et de la chaîne…"
              : "Titre et chaîne remplis automatiquement. Vérifie que c'est bien la bonne vidéo."}
          </p>
        </div>
      )}

      <Champ label="Titre de la base">
        <input
          className="champ"
          maxLength={120}
          placeholder="Base 2x2 avec ferme intégrée"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />
      </Champ>

      <Champ label="Chaîne (facultatif)">
        <input
          className="champ"
          placeholder="Nom du créateur"
          value={auteur}
          onChange={(e) => setAuteur(e.target.value)}
        />
      </Champ>

      <Champ
        label="Description"
        aide="À coller depuis la vidéo : le point d'accès public de YouTube ne la fournit pas. Le site y cherche les quantités annoncées."
      >
        <textarea
          className="champ min-h-[5rem] resize-y text-[14px]"
          maxLength={500}
          value={description}
          onChange={(e) => relire(e.target.value)}
        />
      </Champ>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["grandsBacs", "Grands bacs"],
            ["petitsBacs", "Petits bacs"],
            ["pots", "Pots"],
            ["poulaillers", "Poulaillers"],
          ] as const
        ).map(([cle, label]) => (
          <Champ key={cle} label={label}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className="champ"
              value={q[cle]}
              onChange={(e) => setQ({ ...q, [cle]: Math.max(0, Number(e.target.value)) })}
            />
          </Champ>
        ))}
      </div>

      <Champ label="Pour combien de joueurs" aide="Le premier filtre qu'applique un joueur.">
        <div className="rangee">
          {TAILLES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTaille(t.id)}
              className={`min-h-[2.5rem] rounded-sm border px-3.5 font-display text-[13px] font-semibold transition ${
                taille === t.id
                  ? "border-rouille bg-rouille/15 text-braise"
                  : "border-trait text-cendre hover:border-trait-vif hover:text-craie"
              }`}
            >
              {t.nom}
            </button>
          ))}
        </div>
      </Champ>

      <Champ label={`Difficulté · ${DIFFICULTES[difficulte - 1]}`}>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          className="w-full"
          value={difficulte}
          onChange={(e) => setDifficulte(Number(e.target.value))}
        />
      </Champ>

      <button
        type="button"
        className="bouton bouton-primaire"
        disabled={occupe || !videoId || !titre.trim()}
        onClick={() => void envoyer()}
      >
        {occupe ? "…" : base ? "Enregistrer" : admin ? "Publier" : "Proposer"}
      </button>

      {message && <p className="font-mono text-[13px] text-gene-g">{message}</p>}
      {erreur && <Note ton="alerte">{erreur}</Note>}
    </div>
  );
}
