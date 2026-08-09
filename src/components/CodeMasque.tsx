"use client";

import { useEffect, useState } from "react";

/**
 * Le code d'invitation est masqué par défaut.
 *
 * Quiconque le voit peut rejoindre la ferme. En direct, en partage d'écran ou
 * sur une capture, il suffit d'une seconde à l'image pour qu'il fuite. Le
 * révéler doit être un geste conscient, et il se remasque tout seul.
 */
export function CodeMasque({
  code,
  secondesAvantMasquage = 15,
}: {
  code: string;
  secondesAvantMasquage?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [copie, setCopie] = useState(false);
  const [reste, setReste] = useState(secondesAvantMasquage);

  useEffect(() => {
    if (!visible) return;
    setReste(secondesAvantMasquage);
    const t = setInterval(() => {
      setReste((r) => {
        if (r <= 1) {
          setVisible(false);
          return secondesAvantMasquage;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [visible, secondesAvantMasquage]);

  // Le code change (régénération) : on remasque.
  useEffect(() => setVisible(false), [code]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Masquer le code" : "Révéler le code"}
        className="relative rounded border border-lampe/50 bg-lampe/10 px-4 py-2 font-mono text-xl tracking-[0.2em] text-lampe-chaud transition hover:border-lampe"
      >
        <span
          className={visible ? "" : "select-none blur-[7px]"}
          // La copie du texte reste possible même flouté : le flou est visuel.
          aria-hidden={!visible}
        >
          {code}
        </span>
        {!visible && (
          <span className="absolute inset-0 flex items-center justify-center font-display text-[12px] font-semibold uppercase tracking-widest text-feuille-200">
            Révéler
          </span>
        )}
      </button>

      <button
        type="button"
        className="bouton"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopie(true);
            setTimeout(() => setCopie(false), 2000);
          } catch {
            setVisible(true);
          }
        }}
      >
        {copie ? "Copié" : "Copier"}
      </button>

      {visible && (
        <span className="font-mono text-[12px] text-feuille-400">masqué dans {reste} s</span>
      )}
    </div>
  );
}
