"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const PREFIXE = "rustfarm:";

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
