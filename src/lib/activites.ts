"use client";

import { useCallback, useEffect, useState } from "react";
import { PLANTE_PAR_ID } from "@/data/game";
import { supabase } from "@/lib/supabase";

export interface Activite {
  id: string;
  type: string;
  donnees: Record<string, unknown>;
  cree_le: string;
  acteur: string | null;
}

interface LigneActivite {
  id: string;
  type: string;
  donnees: Record<string, unknown>;
  cree_le: string;
  profils: { pseudo: string } | null;
}

export function useActivites(wipeId: string | null, limite = 20) {
  const [activites, setActivites] = useState<Activite[]>([]);
  const [charge, setCharge] = useState(false);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipeId) {
      setActivites([]);
      setCharge(true);
      return;
    }
    const { data } = await sb
      .from("activites")
      .select("id, type, donnees, cree_le, profils:acteur ( pseudo )")
      .eq("wipe_id", wipeId)
      .order("cree_le", { ascending: false })
      .limit(limite);

    setActivites(
      ((data as unknown as LigneActivite[]) ?? []).map((l) => ({
        id: l.id,
        type: l.type,
        donnees: l.donnees ?? {},
        cree_le: l.cree_le,
        acteur: l.profils?.pseudo ?? null,
      }))
    );
    setCharge(true);
  }, [wipeId, limite]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  return { activites, charge, recharger };
}

/**
 * Une ligne de journal lisible.
 *
 * Le type inconnu n'est pas une erreur : une version plus ancienne du site peut
 * lire des activités écrites par une plus récente. On affiche alors quelque
 * chose de neutre plutôt que rien.
 */
export function decrireActivite(a: Activite): string {
  const qui = a.acteur ?? "Quelqu'un";
  const d = a.donnees;
  const nombre = typeof d.nombre === "number" ? d.nombre : null;
  const plante = typeof d.plante === "string" ? PLANTE_PAR_ID[d.plante]?.nom.toLowerCase() : null;
  const nom = typeof d.nom === "string" ? d.nom : null;

  switch (a.type) {
    case "graines_ajoutees": {
      const origine = d.origine === "scan" ? " au scanner" : "";
      const quoi = nombre === 1 ? "une graine" : `${nombre ?? ""} graines`;
      return `${qui} a ajouté ${quoi}${plante ? ` de ${plante}` : ""}${origine}`;
    }
    case "banque_importee":
      return `${qui} a importé ${nombre ?? ""} graines depuis son navigateur`;
    case "graines_videes":
      return `${qui} a vidé les graines${d.plante && d.plante !== "toutes" ? ` de ${plante}` : ""}`;
    case "timer_lance":
      return `${qui} a lancé « ${nom ?? "un minuteur"} »`;
    case "timer_supprime":
      return `${qui} a supprimé « ${nom ?? "un minuteur"} »`;
    default:
      return `${qui} a modifié la ferme`;
  }
}

/** « il y a 3 min », sans dépendance externe. */
export function ilYA(iso: string): string {
  const secondes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secondes < 60) return "à l'instant";
  const minutes = Math.floor(secondes / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} jours`;
}
