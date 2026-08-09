"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { peutEcrire } from "@/lib/compte";
import { journaliser, useFermeActive } from "@/lib/graines";
import type { LigneProduction } from "@/lib/plantations";
import { supabase } from "@/lib/supabase";

// -----------------------------------------------------------------------------
// Élevage
//
// Les constantes du jeu sont dupliquées de la page Poulailler, qui reste un
// calculateur utilisable sans compte. Elles vivent ici pour que la production
// estimée de la ferme s'en serve sans dépendre d'une page d'interface.
// -----------------------------------------------------------------------------

/** Une poule pleinement satisfaite pond un œuf toutes les deux minutes. */
export const MINUTES_PAR_OEUF = 2;
/** La case de sortie d'un poulailler plafonne : au-delà, la ponte s'arrête. */
export const CAPACITE_SORTIE = 20;
export const POULES_MAX = 4;

export interface Elevage {
  poulaillers: number;
  poulesParPoulailler: number;
  bonheur: number;
}

const VIDE: Elevage = { poulaillers: 0, poulesParPoulailler: 4, bonheur: 1 };

interface LigneElevage {
  poulaillers: number;
  poules_par_poulailler: number;
  bonheur: number;
}

export function useElevage() {
  const { role, wipe, charge: fermeChargee } = useFermeActive();
  const [elevage, setElevage] = useState<Elevage>(VIDE);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const disponible = Boolean(wipe);
  const modifiable = disponible && peutEcrire(role);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipe) {
      setElevage(VIDE);
      setCharge(true);
      return;
    }
    const { data, error } = await sb
      .from("elevages")
      .select("poulaillers, poules_par_poulailler, bonheur")
      .eq("wipe_id", wipe.id)
      .maybeSingle();

    if (error) setErreur(error.message);
    else {
      setErreur(null);
      const l = data as LigneElevage | null;
      setElevage(
        l
          ? {
              poulaillers: l.poulaillers,
              poulesParPoulailler: l.poules_par_poulailler,
              bonheur: Number(l.bonheur),
            }
          : VIDE
      );
    }
    setCharge(true);
  }, [wipe]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const enregistrer = useCallback(
    async (e: Elevage) => {
      const sb = supabase();
      if (!sb || !wipe || !modifiable) return;

      // Une seule ligne par wipe : on écrase plutôt que d'empiler.
      const { error } = await sb.from("elevages").upsert(
        {
          wipe_id: wipe.id,
          poulaillers: e.poulaillers,
          poules_par_poulailler: e.poulesParPoulailler,
          bonheur: e.bonheur,
          maj_le: new Date().toISOString(),
        },
        { onConflict: "wipe_id" }
      );

      if (error) {
        setErreur(error.message);
        return;
      }
      await journaliser(wipe.id, "elevage_modifie", {
        nombre: e.poulaillers * e.poulesParPoulailler,
      });
      await recharger();
    },
    [wipe, modifiable, recharger]
  );

  return { elevage, disponible, modifiable, charge: charge && fermeChargee, erreur, enregistrer, recharger };
}

// -----------------------------------------------------------------------------
// Production
// -----------------------------------------------------------------------------

export interface ProductionOeufs {
  poules: number;
  parHeure: number;
  /** Minutes avant que les cases de sortie soient pleines et que la ponte cesse. */
  minutesAvantSaturation: number;
}

export function calculerProductionOeufs(e: Elevage): ProductionOeufs {
  const poules = Math.min(e.poulesParPoulailler, POULES_MAX) * e.poulaillers;
  const parMinute = (poules / MINUTES_PAR_OEUF) * e.bonheur;
  return {
    poules,
    parHeure: parMinute * 60,
    minutesAvantSaturation:
      parMinute > 0 ? (CAPACITE_SORTIE * e.poulaillers) / parMinute : Infinity,
  };
}

/** Ajoute les œufs aux lignes de production des plantes. */
export function useProductionAvecOeufs(
  production: LigneProduction[],
  elevage: Elevage
): LigneProduction[] {
  return useMemo(() => {
    const oeufs = calculerProductionOeufs(elevage);
    if (oeufs.poules === 0) return production;

    const ligne: LigneProduction = {
      ressource: "œufs",
      parHeure: oeufs.parHeure,
      // Le « cycle » d'un poulailler est le temps avant saturation : c'est lui
      // qui rythme le passage pour ramasser.
      parCycle: CAPACITE_SORTIE * elevage.poulaillers,
      minutesCycle: oeufs.minutesAvantSaturation,
      plants: oeufs.poules,
    };

    return [...production, ligne].sort((a, b) => b.parHeure - a.parHeure);
  }, [production, elevage]);
}
