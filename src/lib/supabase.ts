"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Supabase a renommé la clé publique : `sb_publishable_...` remplace l'ancienne
// clé « anon » en JWT. Les deux noms sont acceptés, pour que le projet
// fonctionne aussi bien avec une configuration récente qu'avec une ancienne.
const CLE_PUBLIQUE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Le site doit continuer de fonctionner sans base de données.
 *
 * Les calculateurs, le scanner et la génétique n'ont besoin de rien d'autre que
 * du navigateur. Tant que les variables d'environnement ne sont pas renseignées,
 * la partie « ferme » se désactive proprement au lieu de faire planter la page.
 */
export const supabaseConfigure = Boolean(URL_SUPABASE && CLE_PUBLIQUE);

let instance: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!supabaseConfigure) return null;
  if (!instance) {
    instance = createClient(URL_SUPABASE!, CLE_PUBLIQUE!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Aucun lien envoyé par e-mail : rien à récupérer dans l'URL.
        detectSessionInUrl: false,
      },
    });
  }
  return instance;
}

/** Message d'erreur lisible, plutôt que l'objet brut de Supabase. */
export function messageErreur(e: unknown): string {
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = String((e as { message: unknown }).message);

    if (m.includes("Email not confirmed")) {
      return "Supabase attend une confirmation par e-mail. Désactive-la : Authentication → Sign In / Providers → Email → Confirm email.";
    }
    if (m.includes("already registered") || m.includes("already been registered")) {
      return "Un compte existe déjà avec cette adresse. Connecte-toi plutôt.";
    }
    if (m.includes("Invalid login credentials")) {
      return "Adresse ou mot de passe incorrect.";
    }
    if (m.includes("Password should be")) {
      return "Mot de passe trop court : six caractères au minimum.";
    }
    if (m.includes("rate limit") || m.includes("Email rate")) {
      return "Trop de tentatives d'affilée. Attends quelques minutes.";
    }
    if (m.toLowerCase().includes("invalid") && m.toLowerCase().includes("email")) {
      return "Adresse e-mail invalide.";
    }
    return m;
  }
  return "Une erreur est survenue.";
}
