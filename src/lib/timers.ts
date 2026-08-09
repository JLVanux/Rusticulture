"use client";

import { useCallback, useEffect, useState } from "react";
import type { Genome, PlanteId } from "@/data/game";
import { parseGenome, formatGenome } from "@/lib/crossbreed";
import { useMinuteurs, type Minuteur } from "@/lib/hooks";
import { peutEcrire } from "@/lib/compte";
import { journaliser, useFermeActive } from "@/lib/graines";
import { supabase, supabaseConfigure } from "@/lib/supabase";
import { idUnique } from "@/lib/storage";

// -----------------------------------------------------------------------------
// Timers
//
// Un timer n'est qu'une date de départ et des durées. N'importe qui charge la
// page et recalcule le temps restant : aucune synchronisation permanente n'est
// nécessaire, une simple ligne en base suffit.
//
// Ce qui reste local en revanche, c'est l'état « déjà notifié ». Il appartient à
// l'appareil, pas à la ferme : si Thomas a vu passer l'alerte sur son téléphone,
// Alex doit quand même la recevoir sur le sien.
// -----------------------------------------------------------------------------

export interface TimerUnifie {
  id: string;
  nom: string;
  plante: PlanteId;
  genome: Genome | null;
  /** Horodatage de plantation, en millisecondes. */
  debut: number;
  minutesCroisement: number;
  minutesMur: number;
  minutesFin: number;
  parQui: string | null;
}

interface LigneTimer {
  id: string;
  nom: string;
  plante: string;
  genes: string | null;
  debut: string;
  minutes_croisement: number;
  minutes_mur: number;
  minutes_fin: number;
  profils: { pseudo: string } | null;
}

const INTERVALLE_RAFRAICHISSEMENT = 30_000;

export function useTimers() {
  const { ferme, role, wipe, charge: fermeChargee } = useFermeActive();
  const [locaux, setLocaux] = useMinuteurs();
  const [distants, setDistants] = useState<TimerUnifie[]>([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const source: "local" | "ferme" = supabaseConfigure && wipe ? "ferme" : "local";
  const modifiable = source === "local" || peutEcrire(role);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipe) {
      setDistants([]);
      setCharge(true);
      return;
    }
    const { data, error } = await sb
      .from("timers")
      .select(
        "id, nom, plante, genes, debut, minutes_croisement, minutes_mur, minutes_fin, profils:cree_par ( pseudo )"
      )
      .eq("wipe_id", wipe.id)
      .eq("archive", false)
      .order("debut", { ascending: true });

    if (error) {
      setErreur(error.message);
    } else {
      setErreur(null);
      setDistants(
        (data as unknown as LigneTimer[]).map((l) => ({
          id: l.id,
          nom: l.nom,
          plante: l.plante as PlanteId,
          genome: l.genes ? parseGenome(l.genes) : null,
          debut: new Date(l.debut).getTime(),
          minutesCroisement: Number(l.minutes_croisement),
          minutesMur: Number(l.minutes_mur),
          minutesFin: Number(l.minutes_fin),
          parQui: l.profils?.pseudo ?? null,
        }))
      );
    }
    setCharge(true);
  }, [wipe]);

  useEffect(() => {
    if (source !== "ferme") {
      setCharge(true);
      return;
    }
    void recharger();

    // Un timer lancé par un coéquipier n'apparaît pas tout seul. Plutôt qu'une
    // connexion permanente, on relit périodiquement et au retour sur l'onglet —
    // c'est le moment où l'on regarde vraiment.
    const t = setInterval(() => void recharger(), INTERVALLE_RAFRAICHISSEMENT);
    const auRetour = () => {
      if (document.visibilityState === "visible") void recharger();
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [source, recharger]);

  const timers: TimerUnifie[] =
    source === "ferme"
      ? distants
      : locaux.map((m) => ({
          id: m.id,
          nom: m.nom,
          plante: m.plante,
          genome: m.genome,
          debut: m.debut,
          minutesCroisement: m.minutesCroisement,
          minutesMur: m.minutesMur,
          minutesFin: m.minutesFin,
          parQui: null,
        }));

  const lancer = useCallback(
    async (t: Omit<TimerUnifie, "id" | "parQui">) => {
      if (!modifiable) return;

      if (source === "local") {
        const m: Minuteur = {
          id: idUnique(),
          nom: t.nom,
          plante: t.plante,
          genome: t.genome ?? ["X", "X", "X", "X", "X", "X"],
          debut: t.debut,
          minutesCroisement: t.minutesCroisement,
          minutesMur: t.minutesMur,
          minutesFin: t.minutesFin,
        };
        setLocaux((prec) => [...prec, m]);
        return;
      }

      const sb = supabase();
      if (!sb || !wipe) return;
      const { data: utilisateur } = await sb.auth.getUser();

      const { error } = await sb.from("timers").insert({
        wipe_id: wipe.id,
        cree_par: utilisateur.user?.id ?? null,
        nom: t.nom,
        plante: t.plante,
        genes: t.genome ? formatGenome(t.genome) : null,
        debut: new Date(t.debut).toISOString(),
        minutes_croisement: t.minutesCroisement,
        minutes_mur: t.minutesMur,
        minutes_fin: t.minutesFin,
      });

      if (error) {
        setErreur(error.message);
        return;
      }
      await journaliser(wipe.id, "timer_lance", { nom: t.nom, plante: t.plante });
      await recharger();
    },
    [source, modifiable, setLocaux, wipe, ferme, recharger]
  );

  const supprimer = useCallback(
    async (id: string, nom: string) => {
      if (!modifiable) return;

      if (source === "local") {
        setLocaux((prec) => prec.filter((m) => m.id !== id));
        return;
      }

      const sb = supabase();
      if (!sb || !wipe) return;
      const { error } = await sb.from("timers").delete().eq("id", id);
      if (error) setErreur(error.message);
      else await journaliser(wipe.id, "timer_supprime", { nom });
      await recharger();
    },
    [source, modifiable, setLocaux, wipe, recharger]
  );

  return {
    timers,
    source,
    modifiable,
    ferme,
    wipe,
    charge: charge && (source === "local" || fermeChargee),
    erreur,
    lancer,
    supprimer,
    recharger,
  };
}
