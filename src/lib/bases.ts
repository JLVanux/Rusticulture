"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Répertoire de bases de farm.
 *
 * On ne stocke jamais une URL, seulement l'IDENTIFIANT de la vidéo. Une URL
 * libre pourrait mener n'importe où et il suffirait d'un lien piégé validé par
 * inadvertance ; un identifiant de onze caractères ne peut désigner qu'une
 * vidéo YouTube.
 *
 * La miniature s'obtient sans clé d'API ni quota.
 */

/**
 * Pour combien de joueurs la base est pensée.
 *
 * Premier filtre qu'applique un joueur : une base solo et une base de groupe
 * n'ont ni la même surface, ni le même coût d'entretien, ni le même nombre de
 * bacs. Une note de difficulté seule ne dit rien de ça.
 */
export type TailleBase = "solo" | "solo_duo" | "duo_trio" | "groupe";

export const TAILLES: { id: TailleBase; nom: string; court: string }[] = [
  { id: "solo", nom: "Solo", court: "Solo" },
  { id: "solo_duo", nom: "Solo / duo", court: "Solo-duo" },
  { id: "duo_trio", nom: "Duo / trio", court: "Duo-trio" },
  { id: "groupe", nom: "Quatre joueurs et plus", court: "Groupe" },
];

export const TAILLE_PAR_ID = Object.fromEntries(TAILLES.map((t) => [t.id, t])) as Record<
  TailleBase,
  (typeof TAILLES)[number]
>;

export interface Base {
  id: string;
  videoId: string;
  titre: string;
  auteurVideo: string | null;
  description: string | null;
  grandsBacs: number;
  petitsBacs: number;
  pots: number;
  poulaillers: number;
  difficulte: number;
  taille: TailleBase;
  publiee: boolean;
  proposePar: string | null;
  creeLe: string;
}

/** L'identifiant d'une vidéo, quelle que soit la forme du lien collé. */
export function extraireVideoId(entree: string): string | null {
  const texte = entree.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(texte)) return texte;

  const motifs = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const m of motifs) {
    const r = texte.match(m);
    if (r) return r[1];
  }
  return null;
}

export function miniature(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function lienVideo(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Lit les quantités annoncées dans un texte libre.
 *
 * Beaucoup de descriptions listent le contenu — « 6 grands bacs, 2 pots ». On
 * s'en sert pour PRÉ-REMPLIR le formulaire, jamais pour valider : une lecture
 * automatique se trompe, et c'est acceptable seulement parce qu'un humain
 * corrige derrière.
 */
export function lireQuantites(texte: string): Partial<Record<
  "grandsBacs" | "petitsBacs" | "pots" | "poulaillers",
  number
>> {
  const t = texte.toLowerCase();
  const trouve = (motif: RegExp): number | undefined => {
    const m = t.match(motif);
    if (!m) return undefined;
    const n = Number(m[1]);
    return Number.isFinite(n) && n >= 0 && n <= 200 ? n : undefined;
  };

  return {
    grandsBacs: trouve(/(\d{1,3})\s*(?:x\s*)?grands?\s*bacs?/),
    petitsBacs: trouve(/(\d{1,3})\s*(?:x\s*)?petits?\s*bacs?/),
    pots: trouve(/(\d{1,3})\s*(?:x\s*)?pots?\b/),
    poulaillers: trouve(/(\d{1,3})\s*(?:x\s*)?poulaillers?/),
  };
}

interface Ligne {
  id: string;
  video_id: string;
  titre: string;
  auteur_video: string | null;
  description: string | null;
  grands_bacs: number;
  petits_bacs: number;
  pots: number;
  poulaillers: number;
  difficulte: number;
  taille: TailleBase;
  publiee: boolean;
  propose_par: string | null;
  cree_le: string;
}

const convertir = (l: Ligne): Base => ({
  id: l.id,
  videoId: l.video_id,
  titre: l.titre,
  auteurVideo: l.auteur_video,
  description: l.description,
  grandsBacs: l.grands_bacs,
  petitsBacs: l.petits_bacs,
  pots: l.pots,
  poulaillers: l.poulaillers,
  difficulte: l.difficulte,
  taille: (l.taille as TailleBase) ?? "duo_trio",
  publiee: l.publiee,
  proposePar: l.propose_par,
  creeLe: l.cree_le,
});

export function useBases(inclureNonPubliees = false) {
  const [bases, setBases] = useState<Base[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb) {
      setCharge(true);
      return;
    }
    let requete = sb.from("bases").select("*").order("cree_le", { ascending: false });
    if (!inclureNonPubliees) requete = requete.eq("publiee", true);

    const { data, error } = await requete;
    if (error) setErreur(error.message);
    else setBases(((data as Ligne[]) ?? []).map(convertir));
    setCharge(true);
  }, [inclureNonPubliees]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  return { bases, charge, erreur, recharger };
}

export async function proposerBase(b: Omit<Base, "id" | "publiee" | "proposePar" | "creeLe">, publier = false) {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { data: u } = await sb.auth.getUser();
  if (!u.user) throw new Error("connexion requise");

  const { error } = await sb.from("bases").insert({
    video_id: b.videoId,
    titre: b.titre.trim(),
    auteur_video: b.auteurVideo?.trim() || null,
    description: b.description?.trim() || null,
    grands_bacs: b.grandsBacs,
    petits_bacs: b.petitsBacs,
    pots: b.pots,
    poulaillers: b.poulaillers,
    difficulte: b.difficulte,
    taille: b.taille,
    publiee: publier,
    propose_par: u.user.id,
  });
  if (error) throw error;
}

/** Corrige une base : un administrateur relit et ajuste avant de publier. */
export async function modifierBase(
  id: string,
  b: Omit<Base, "id" | "publiee" | "proposePar" | "creeLe">
) {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { error } = await sb
    .from("bases")
    .update({
      video_id: b.videoId,
      titre: b.titre.trim(),
      auteur_video: b.auteurVideo?.trim() || null,
      description: b.description?.trim() || null,
      grands_bacs: b.grandsBacs,
      petits_bacs: b.petitsBacs,
      pots: b.pots,
      poulaillers: b.poulaillers,
      difficulte: b.difficulte,
      taille: b.taille,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function publierBase(id: string, publiee: boolean) {
  const sb = supabase();
  if (!sb) return;
  await sb.from("bases").update({ publiee }).eq("id", id);
}

export async function supprimerBase(id: string) {
  const sb = supabase();
  if (!sb) return;
  await sb.from("bases").delete().eq("id", id);
}

/** Est-on administrateur ? Sert à masquer ce qui ne servirait à rien d'afficher —
 *  la vraie protection est dans les politiques de la base. */
export function useAdmin() {
  const [admin, setAdmin] = useState(false);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setCharge(true);
      return;
    }
    void sb.rpc("est_admin").then(({ data }) => {
      setAdmin(Boolean(data));
      setCharge(true);
    });
  }, []);

  return { admin, charge };
}
