"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREFIXE = "rusticulture:";
const PREFIXE_ANCIEN = "rustfarm:";

/**
 * Reprise des données enregistrées sous l'ancien nom du site.
 *
 * Renommer le préfixe de stockage sans rien faire d'autre reviendrait à effacer
 * les banques de graines, les minuteurs, les réglages, la zone de scan et la
 * palette apprise de quiconque avait déjà utilisé le site. On déplace donc les
 * anciennes clés vers les nouvelles au premier chargement.
 *
 * Une clé déjà présente sous le nouveau nom n'est jamais écrasée : les données
 * récentes priment toujours sur d'anciennes qui traîneraient.
 */
let migrationFaite = false;

function migrerAncienStockage() {
  if (migrationFaite || typeof window === "undefined") return;
  migrationFaite = true;
  try {
    // On liste avant de modifier : supprimer pendant l'itération décale les index.
    const aDeplacer: [string, string][] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const cle = window.localStorage.key(i);
      if (!cle || !cle.startsWith(PREFIXE_ANCIEN)) continue;
      aDeplacer.push([cle, PREFIXE + cle.slice(PREFIXE_ANCIEN.length)]);
    }
    for (const [ancienne, nouvelle] of aDeplacer) {
      const valeur = window.localStorage.getItem(ancienne);
      if (valeur !== null && window.localStorage.getItem(nouvelle) === null) {
        window.localStorage.setItem(nouvelle, valeur);
      }
      window.localStorage.removeItem(ancienne);
    }
  } catch {
    // Stockage indisponible : on repartira simplement des valeurs par défaut.
  }
}

/**
 * État persisté dans le navigateur. Rien ne part sur un serveur : la banque de
 * graines, les minuteurs et les réglages restent sur la machine.
 *
 * L'écriture se fait dans un effet, pas à l'intérieur de la mise à jour d'état :
 * React peut rejouer une fonction de mise à jour, et un effet de bord glissé
 * là-dedans s'exécuterait deux fois.
 */
export function useStockage<T>(cle: string, valeurInitiale: T) {
  const [valeur, setValeur] = useState<T>(valeurInitiale);
  const [charge, setCharge] = useState(false);
  const cleChargee = useRef<string | null>(null);

  useEffect(() => {
    setCharge(false);
    migrerAncienStockage();
    try {
      const brut = window.localStorage.getItem(PREFIXE + cle);
      setValeur(brut !== null ? (JSON.parse(brut) as T) : valeurInitiale);
    } catch {
      // Stockage indisponible (mode privé, quota) : on reste sur l'initial.
    }
    cleChargee.current = cle;
    setCharge(true);
    // `valeurInitiale` est volontairement exclu : on ne recharge que si la clé change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  useEffect(() => {
    // On n'écrit qu'après avoir lu, sinon on écraserait le contenu existant
    // avec la valeur initiale au premier rendu.
    if (!charge || cleChargee.current !== cle) return;
    try {
      window.localStorage.setItem(PREFIXE + cle, JSON.stringify(valeur));
    } catch {
      // Ignoré volontairement.
    }
  }, [cle, charge, valeur]);

  const ecrire = useCallback((maj: T | ((prec: T) => T)) => {
    setValeur((prec) => (typeof maj === "function" ? (maj as (p: T) => T)(prec) : maj));
  }, []);

  return [valeur, ecrire, charge] as const;
}

export function idUnique() {
  return Math.random().toString(36).slice(2, 10);
}
