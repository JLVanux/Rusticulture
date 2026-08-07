"use client";

import type { Genome, PlanteId } from "@/data/game";
import { CONSTANTES_DEFAUT, CONDITIONS_PARFAITES, type Conditions, type Constantes } from "@/lib/model";
import { useStockage } from "@/lib/storage";

export interface Graine {
  id: string;
  genome: Genome;
  quantite: number;
  plante: PlanteId;
  note?: string;
}

export function useBanque() {
  return useStockage<Graine[]>("banque", []);
}

/**
 * Les coefficients sont versionnés.
 *
 * `facteurG` a changé de SENS entre deux versions du modèle : il valait
 * autrefois un gain de vitesse linéaire (0,72 = « +72 % de vitesse »), il
 * représente maintenant une réduction géométrique (0,17 = « −17 % du temps
 * restant par gène G »). Relire l'ancienne valeur avec la nouvelle formule
 * donnait des cycles de quatre minutes.
 *
 * Changer la clé de stockage à chaque changement de sens évite ça : une
 * sauvegarde d'une version antérieure est simplement ignorée.
 */
const VERSION_CONSTANTES = 2;

export function useConstantes() {
  const [valeur, ecrire, charge] = useStockage<Constantes>(
    `constantes-v${VERSION_CONSTANTES}`,
    CONSTANTES_DEFAUT
  );

  // Ceinture et bretelles : une valeur hors bornes trahit une sauvegarde d'une
  // autre époque, ou une saisie aberrante. On repart des valeurs par défaut.
  const sain =
    valeur.facteurG >= 0 &&
    valeur.facteurG < 0.9 &&
    valeur.facteurY >= 0 &&
    valeur.facteurY < 5 &&
    valeur.tauxServeur > 0;

  return [sain ? valeur : CONSTANTES_DEFAUT, ecrire, charge] as const;
}

export function useConditions() {
  return useStockage<Conditions>("conditions", CONDITIONS_PARFAITES);
}

export interface Minuteur {
  id: string;
  nom: string;
  plante: PlanteId;
  genome: Genome;
  /** Horodatage de plantation, en ms. */
  debut: number;
  minutesCroisement: number;
  minutesMur: number;
  minutesFin: number;
  alerteCroisementFaite?: boolean;
  alerteMurFaite?: boolean;
}

export function useMinuteurs() {
  return useStockage<Minuteur[]>("minuteurs", []);
}
