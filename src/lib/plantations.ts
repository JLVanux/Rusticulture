"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PLANTE_PAR_ID, type Genome, type PlanteId } from "@/data/game";
import { formatGenome, parseGenome } from "@/lib/crossbreed";
import { peutEcrire } from "@/lib/compte";
import { journaliser, useFermeActive } from "@/lib/graines";
import { calculerCroissance, calculerRendement } from "@/lib/model";
import { useConditions, useConstantes } from "@/lib/hooks";
import { supabase } from "@/lib/supabase";

// -----------------------------------------------------------------------------
// Plantations
//
// Le croisement suppose le grand bac, seul contenant dont la grille 3×3 produit
// les probabilités du site. Les autres contenants ne servent qu'à produire :
// c'est ici qu'ils comptent, et nulle part ailleurs.
// -----------------------------------------------------------------------------

export type Contenant = "grand_bac" | "petit_bac" | "bac_triangulaire" | "pot";

export const CONTENANTS: { id: Contenant; nom: string; plants: number; note: string }[] = [
  { id: "grand_bac", nom: "Grand bac", plants: 9, note: "Le seul où le croisement fonctionne." },
  { id: "bac_triangulaire", nom: "Bac triangulaire", plants: 3, note: "Production seulement." },
  { id: "petit_bac", nom: "Petit bac", plants: 1, note: "Production seulement." },
  { id: "pot", nom: "Pot", plants: 1, note: "Production seulement." },
];

export const CONTENANT_PAR_ID = Object.fromEntries(CONTENANTS.map((c) => [c.id, c])) as Record<
  Contenant,
  (typeof CONTENANTS)[number]
>;

export interface Plantation {
  id: string;
  contenant: Contenant;
  plante: PlanteId;
  genome: Genome | null;
  /** Nombre de contenants de ce type avec cette configuration. */
  quantite: number;
  libelle: string | null;
}

interface LignePlantation {
  id: string;
  contenant: string;
  plante: string;
  genes: string | null;
  quantite: number;
  libelle: string | null;
}

export function usePlantations() {
  const { ferme, role, wipe, charge: fermeChargee, connecte } = useFermeActive();
  const [plantations, setPlantations] = useState<Plantation[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const disponible = Boolean(wipe);
  const modifiable = disponible && peutEcrire(role);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipe) {
      setPlantations([]);
      setCharge(true);
      return;
    }
    const { data, error } = await sb
      .from("plantations")
      .select("id, contenant, plante, genes, quantite, libelle")
      .eq("wipe_id", wipe.id)
      .order("cree_le", { ascending: true });

    if (error) setErreur(error.message);
    else {
      setErreur(null);
      setPlantations(
        ((data as LignePlantation[]) ?? []).map((l) => ({
          id: l.id,
          contenant: l.contenant as Contenant,
          plante: l.plante as PlanteId,
          genome: l.genes ? parseGenome(l.genes) : null,
          quantite: l.quantite,
          libelle: l.libelle,
        }))
      );
    }
    setCharge(true);
  }, [wipe]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const ajouter = useCallback(
    async (p: Omit<Plantation, "id">) => {
      const sb = supabase();
      if (!sb || !wipe || !modifiable) return;
      const { error } = await sb.from("plantations").insert({
        wipe_id: wipe.id,
        contenant: p.contenant,
        plante: p.plante,
        genes: p.genome ? formatGenome(p.genome) : null,
        quantite: p.quantite,
        libelle: p.libelle,
      });
      if (error) setErreur(error.message);
      else {
        await journaliser(wipe.id, "plantation_ajoutee", {
          plante: p.plante,
          contenant: p.contenant,
          nombre: p.quantite,
        });
        await recharger();
      }
    },
    [wipe, modifiable, recharger]
  );

  const supprimer = useCallback(
    async (id: string) => {
      const sb = supabase();
      if (!sb || !wipe || !modifiable) return;
      const { error } = await sb.from("plantations").delete().eq("id", id);
      if (error) setErreur(error.message);
      else {
        await journaliser(wipe.id, "plantation_retiree", {});
        await recharger();
      }
    },
    [wipe, modifiable, recharger]
  );

  const modifierQuantite = useCallback(
    async (id: string, quantite: number) => {
      const sb = supabase();
      if (!sb || !modifiable || quantite < 1) return;
      const { error } = await sb.from("plantations").update({ quantite }).eq("id", id);
      if (error) setErreur(error.message);
      await recharger();
    },
    [modifiable, recharger]
  );

  return {
    plantations,
    ferme,
    wipe,
    role,
    disponible,
    modifiable,
    connecte,
    charge: charge && fermeChargee,
    erreur,
    ajouter,
    supprimer,
    modifierQuantite,
    recharger,
  };
}

// -----------------------------------------------------------------------------
// Production estimée
//
// « Estimée » est à prendre au pied de la lettre : c'est le modèle du site
// appliqué à la configuration déclarée, pas une observation. Elle ne doit jamais
// être présentée comme une production constatée.
// -----------------------------------------------------------------------------

export interface LigneProduction {
  ressource: string;
  parHeure: number;
  parCycle: number;
  minutesCycle: number;
  plants: number;
}

export function useProductionEstimee(plantations: Plantation[]) {
  const [constantes] = useConstantes();
  const [conditions] = useConditions();

  return useMemo(() => {
    const parRessource = new Map<string, LigneProduction>();

    for (const p of plantations) {
      const plante = PLANTE_PAR_ID[p.plante];
      if (!plante) continue;

      // Sans gènes renseignés, on suppose une graine brute : c'est le pire cas,
      // donc une estimation basse plutôt que flatteuse.
      const genome: Genome = p.genome ?? ["X", "X", "X", "X", "X", "X"];
      const plantsParContenant = CONTENANT_PAR_ID[p.contenant]?.plants ?? 1;
      const plants = plantsParContenant * p.quantite;

      const croissance = calculerCroissance(p.plante, genome, conditions, constantes);
      const rendement = calculerRendement(p.plante, genome, conditions, constantes, {
        plantsParBac: plants,
        bonusTheRecolte: 0,
        minutesCycle: croissance.minutesJusquMur,
      });

      const existant = parRessource.get(plante.ressource);
      const ligne: LigneProduction = {
        ressource: plante.ressource,
        parHeure: (existant?.parHeure ?? 0) + rendement.parHeure,
        parCycle: (existant?.parCycle ?? 0) + rendement.parBac,
        // On garde le cycle le plus long : c'est lui qui rythme la récolte.
        minutesCycle: Math.max(existant?.minutesCycle ?? 0, croissance.minutesJusquMur),
        plants: (existant?.plants ?? 0) + plants,
      };
      parRessource.set(plante.ressource, ligne);
    }

    return [...parRessource.values()].sort((a, b) => b.parHeure - a.parHeure);
  }, [plantations, conditions, constantes]);
}
