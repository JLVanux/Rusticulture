"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigure } from "@/lib/supabase";

// -----------------------------------------------------------------------------
// Types, miroirs du schéma de `supabase/migrations/0001_fondations.sql`.
// -----------------------------------------------------------------------------

export type RoleFerme = "proprietaire" | "membre" | "lecture";

export interface Profil {
  id: string;
  pseudo: string;
  avatar_url: string | null;
}

export interface Ferme {
  id: string;
  nom: string;
  cree_par: string;
  code_invitation: string;
  cree_le: string;
}

export interface Membre {
  ferme_id: string;
  profil_id: string;
  role: RoleFerme;
  rejoint_le: string;
  profils?: Profil | null;
}

export interface Wipe {
  id: string;
  ferme_id: string;
  nom: string;
  serveur: string | null;
  debut: string;
  fin: string | null;
  actif: boolean;
}

/** Ce que le rôle autorise. Le vrai contrôle est dans la base ; ceci sert à
 *  griser les boutons plutôt qu'à protéger quoi que ce soit. */
export function peutEcrire(role: RoleFerme | null): boolean {
  return role === "proprietaire" || role === "membre";
}

// -----------------------------------------------------------------------------
// Comptes par pseudo
//
// Aucun e-mail n'est demandé ni envoyé. Supabase exigeant techniquement une
// adresse pour un compte mot de passe, on en dérive une du pseudo. Elle n'est
// jamais affichée et ne sert jamais à écrire à qui que ce soit.
// -----------------------------------------------------------------------------

const DOMAINE_INTERNE = "comptes.rusticulture.app";

/** Réduit un pseudo à ce qui peut tenir dans une adresse : sans accent ni espace. */
export function normaliserPseudo(pseudo: string): string {
  return pseudo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

export function adresseInterne(pseudo: string): string {
  return `${normaliserPseudo(pseudo)}@${DOMAINE_INTERNE}`;
}

export function verifierPseudo(pseudo: string): string | null {
  const brut = pseudo.trim();
  if (brut.length < 2) return "Le pseudo doit faire au moins 2 caractères.";
  if (brut.length > 32) return "Le pseudo ne peut pas dépasser 32 caractères.";
  if (normaliserPseudo(brut).length < 2) {
    return "Le pseudo doit contenir au moins deux lettres ou chiffres.";
  }
  return null;
}

export async function pseudoDisponible(pseudo: string): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  const { data, error } = await sb.rpc("pseudo_disponible", { p: pseudo.trim() });
  if (error) throw error;
  return Boolean(data);
}

export async function inscription(pseudo: string, motDePasse: string) {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");

  const probleme = verifierPseudo(pseudo);
  if (probleme) throw new Error(probleme);
  if (motDePasse.length < 8) throw new Error("Le mot de passe doit faire au moins 8 caractères.");

  if (!(await pseudoDisponible(pseudo))) {
    throw new Error("Ce pseudo est déjà pris.");
  }

  const { error } = await sb.auth.signUp({
    email: adresseInterne(pseudo),
    password: motDePasse,
    options: { data: { pseudo: pseudo.trim() } },
  });
  if (error) throw error;
}

export async function connexion(pseudo: string, motDePasse: string) {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { error } = await sb.auth.signInWithPassword({
    email: adresseInterne(pseudo),
    password: motDePasse,
  });
  if (error) throw error;
}

export async function changerPseudo(nouveau: string): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { data, error } = await sb.rpc("changer_pseudo", { nouveau });
  if (error) throw error;
  return data as string;
}

// -----------------------------------------------------------------------------
// Session
// -----------------------------------------------------------------------------

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setCharge(true);
      return;
    }

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCharge(true);
    });

    const { data: abonnement } = sb.auth.onAuthStateChange((_evenement, s) => {
      setSession(s);
      setCharge(true);
    });

    return () => abonnement.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sb = supabase();
    if (!sb || !session) {
      setProfil(null);
      return;
    }
    let annule = false;
    sb.from("profils")
      .select("id, pseudo, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!annule) setProfil((data as Profil) ?? null);
      });
    return () => {
      annule = true;
    };
  }, [session]);

  const deconnexion = useCallback(async () => {
    await supabase()?.auth.signOut();
  }, []);

  return { session, profil, charge, connecte: Boolean(session), deconnexion, disponible: supabaseConfigure };
}

// -----------------------------------------------------------------------------
// Fermes
// -----------------------------------------------------------------------------

export function useFermes() {
  const { session, charge: sessionChargee } = useSession();
  const [fermes, setFermes] = useState<{ ferme: Ferme; role: RoleFerme }[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !session) {
      setFermes([]);
      setCharge(true);
      return;
    }
    // Les politiques limitent déjà le résultat aux fermes dont on est membre :
    // pas besoin de filtrer côté client.
    const { data, error } = await sb
      .from("membres")
      .select("role, fermes ( id, nom, cree_par, code_invitation, cree_le )")
      .eq("profil_id", session.user.id);

    if (error) setErreur(error.message);
    else {
      setFermes(
        (data ?? [])
          .filter((l) => l.fermes)
          .map((l) => ({ ferme: l.fermes as unknown as Ferme, role: l.role as RoleFerme }))
      );
      setErreur(null);
    }
    setCharge(true);
  }, [session]);

  useEffect(() => {
    if (sessionChargee) void recharger();
  }, [sessionChargee, recharger]);

  return { fermes, charge, erreur, recharger };
}

/** Détail d'une ferme : membres et wipe actif. */
export function useDetailFerme(fermeId: string | null) {
  const [membres, setMembres] = useState<Membre[]>([]);
  const [wipe, setWipe] = useState<Wipe | null>(null);
  const [charge, setCharge] = useState(false);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !fermeId) {
      setMembres([]);
      setWipe(null);
      setCharge(true);
      return;
    }
    setCharge(false);

    const [m, w] = await Promise.all([
      sb
        .from("membres")
        .select("ferme_id, profil_id, role, rejoint_le, profils ( id, pseudo, avatar_url )")
        .eq("ferme_id", fermeId),
      sb.from("wipes").select("*").eq("ferme_id", fermeId).eq("actif", true).maybeSingle(),
    ]);

    setMembres((m.data ?? []) as unknown as Membre[]);
    setWipe((w.data as Wipe) ?? null);
    setCharge(true);
  }, [fermeId]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  return { membres, wipe, charge, recharger };
}

// -----------------------------------------------------------------------------
// Actions
//
// Créer et rejoindre passent par des fonctions en base : la première doit
// inscrire son auteur comme propriétaire dans la même transaction, la seconde
// doit retrouver une ferme par son code alors que les politiques interdisent
// justement de voir les fermes dont on n'est pas membre.
// -----------------------------------------------------------------------------

export async function creerFerme(nom: string, nomWipe: string): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { data, error } = await sb.rpc("creer_ferme", {
    nom_ferme: nom.trim(),
    nom_wipe: nomWipe.trim() || "Wipe 1",
  });
  if (error) throw error;
  return data as string;
}

export async function rejoindreFerme(code: string): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { data, error } = await sb.rpc("rejoindre_ferme", { code: code.trim() });
  if (error) throw error;
  return data as string;
}

export async function regenererCode(fermeId: string): Promise<string> {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { data, error } = await sb.rpc("regenerer_code_invitation", { f: fermeId });
  if (error) throw error;
  return data as string;
}

export async function changerRole(fermeId: string, profilId: string, role: RoleFerme) {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { error } = await sb.from("membres").update({ role }).eq("ferme_id", fermeId).eq("profil_id", profilId);
  if (error) throw error;
}

export async function retirerMembre(fermeId: string, profilId: string) {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { error } = await sb.from("membres").delete().eq("ferme_id", fermeId).eq("profil_id", profilId);
  if (error) throw error;
}

/**
 * Supprime définitivement le compte courant.
 *
 * L'appelant n'est pas un paramètre : la fonction en base lit `auth.uid()`
 * elle-même, on ne peut donc pas s'en servir pour supprimer quelqu'un d'autre.
 */
export async function supprimerMonCompte() {
  const sb = supabase();
  if (!sb) throw new Error("base de données non configurée");
  const { error } = await sb.rpc("supprimer_mon_compte");
  if (error) throw error;
  await sb.auth.signOut();
}
