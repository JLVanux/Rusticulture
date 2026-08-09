"use client";

import { useEffect } from "react";
import { supabase, supabaseConfigure } from "@/lib/supabase";

const CLE = "rusticulture:dernier-reveil";
const INTERVALLE = 4 * 60_000;

/**
 * Réveille l'envoi des notifications quand un membre ouvre le site.
 *
 * La tâche planifiée GitHub passe toutes les dix minutes, sans garantie de
 * ponctualité : un passage peut glisser, voire sauter en période de charge.
 * Résultat, une récolte prête peut attendre un quart d'heure son message.
 *
 * Dès que quelqu'un de l'équipe a le site ouvert, on déclenche une vérification
 * — limitée à ses propres fermes, et au plus une fois toutes les quatre
 * minutes. Le jeton envoyé est celui de sa session : aucun secret ne descend
 * dans le navigateur.
 *
 * Les échecs sont ignorés en silence. Ce n'est qu'un coup de pouce ; la tâche
 * planifiée reste le filet.
 */
export function useReveilNotifications() {
  useEffect(() => {
    if (!supabaseConfigure) return;

    const dernier = Number(localStorage.getItem(CLE) ?? 0);
    if (Date.now() - dernier < INTERVALLE) return;

    const sb = supabase();
    if (!sb) return;

    void (async () => {
      const { data } = await sb.auth.getSession();
      const jeton = data.session?.access_token;
      if (!jeton) return;

      localStorage.setItem(CLE, String(Date.now()));
      try {
        await fetch("/api/notifications", { headers: { Authorization: `Bearer ${jeton}` } });
      } catch {
        // Sans importance : la tâche planifiée passera.
      }
    })();
  }, []);
}
