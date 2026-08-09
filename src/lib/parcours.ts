"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PHASES, type ContexteParcours, type Etape } from "@/data/parcours";
import { peutEcrire } from "@/lib/compte";
import { useFermeActive } from "@/lib/graines";
import { supabase } from "@/lib/supabase";

export interface EtapeEtat {
  etape: Etape;
  faite: boolean;
  /** Vraie quand c'est le site qui l'a constatée, pas l'utilisateur. */
  automatique: boolean;
}

export interface PhaseEtat {
  id: string;
  titre: string;
  sousTitre: string;
  etapes: EtapeEtat[];
  faites: number;
  total: number;
}

export function useParcours(contexte: ContexteParcours) {
  const { role, wipe, charge: fermeChargee } = useFermeActive();
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [charge, setCharge] = useState(false);

  const modifiable = Boolean(wipe) && peutEcrire(role);

  const recharger = useCallback(async () => {
    const sb = supabase();
    if (!sb || !wipe) {
      setCoches(new Set());
      setCharge(true);
      return;
    }
    const { data } = await sb.from("parcours").select("etape_id").eq("wipe_id", wipe.id);
    setCoches(new Set(((data ?? []) as { etape_id: string }[]).map((l) => l.etape_id)));
    setCharge(true);
  }, [wipe]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  const basculer = useCallback(
    async (etapeId: string, fait: boolean) => {
      const sb = supabase();
      if (!sb || !wipe || !modifiable) return;

      // On met à jour l'affichage tout de suite : cocher une case doit répondre
      // instantanément, l'aller-retour réseau ne doit pas se voir.
      setCoches((prec) => {
        const suivant = new Set(prec);
        if (fait) suivant.add(etapeId);
        else suivant.delete(etapeId);
        return suivant;
      });

      if (fait) {
        const { data: u } = await sb.auth.getUser();
        await sb
          .from("parcours")
          .upsert({ wipe_id: wipe.id, etape_id: etapeId, par_qui: u.user?.id ?? null });
      } else {
        await sb.from("parcours").delete().eq("wipe_id", wipe.id).eq("etape_id", etapeId);
      }
    },
    [wipe, modifiable]
  );

  // Une étape constatée est enregistrée définitivement.
  //
  // Sans ça, le parcours RECULE : « ramasser douze graines » se dévalide dès
  // qu'on les a plantées, « trois boutures de secours » dès qu'on les utilise.
  // Voir une étape acquise redevenir à faire est décourageant, et c'est faux :
  // elle a bien été franchie.
  useEffect(() => {
    if (!wipe || !modifiable || !charge) return;

    const nouvelles = PHASES.flatMap((p) => p.etapes)
      .filter((e) => e.verifier?.(contexte) === true && !coches.has(e.id))
      .map((e) => e.id);
    if (nouvelles.length === 0) return;

    setCoches((prec) => new Set([...prec, ...nouvelles]));

    const sb = supabase();
    if (!sb) return;
    void sb.auth.getUser().then(({ data }) =>
      sb.from("parcours").upsert(
        nouvelles.map((id) => ({
          wipe_id: wipe.id,
          etape_id: id,
          par_qui: data.user?.id ?? null,
        }))
      )
    );
  }, [contexte, coches, wipe, modifiable, charge]);

  const phases: PhaseEtat[] = useMemo(
    () =>
      PHASES.map((phase) => {
        const etapes: EtapeEtat[] = phase.etapes.map((etape) => {
          const constatable = Boolean(etape.verifier);
          const constat = etape.verifier?.(contexte) === true;
          const enregistree = coches.has(etape.id);
          return {
            etape,
            faite: constat || enregistree,
            // Une étape que le site sait constater ne se décoche pas à la main :
            // ce serait contredire une donnée enregistrée.
            automatique: constatable && (constat || enregistree),
          };
        });
        return {
          id: phase.id,
          titre: phase.titre,
          sousTitre: phase.sousTitre,
          etapes,
          faites: etapes.filter((e) => e.faite).length,
          total: etapes.length,
        };
      }),
    [contexte, coches]
  );

  const total = phases.reduce((a, p) => a + p.total, 0);
  const faites = phases.reduce((a, p) => a + p.faites, 0);

  // La phase courante est la première inachevée : c'est là qu'on ouvre.
  const phaseCourante = phases.find((p) => p.faites < p.total) ?? phases[phases.length - 1];

  /** La prochaine chose à faire, tous phases confondues. */
  const prochaine = phases
    .flatMap((p) => p.etapes)
    .find((e) => !e.faite)?.etape;

  return {
    phases,
    phaseCourante,
    prochaine,
    faites,
    total,
    modifiable,
    charge: charge && fermeChargee,
    basculer,
    recharger,
  };
}
