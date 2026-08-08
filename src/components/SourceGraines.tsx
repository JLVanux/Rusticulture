"use client";

import Link from "next/link";
import { useState } from "react";
import type { SourceGraines } from "@/lib/graines";

/**
 * Où sont rangées les graines : dans le navigateur, ou dans la ferme partagée.
 *
 * Sans cette indication, quelqu'un qui ajoute une graine ne sait pas si son
 * coéquipier la verra. C'est la question la plus immédiate dès qu'il y a deux
 * stockages possibles, donc elle est répondue avant qu'on la pose.
 */
export function SourceGrainesBandeau({
  source,
  nomFerme,
  nbLocal,
  onTransferer,
  modifiable = true,
  enAttente = false,
}: {
  source: SourceGraines;
  nomFerme?: string | null;
  nbLocal?: number;
  onTransferer?: () => Promise<number>;
  modifiable?: boolean;
  enAttente?: boolean;
}) {
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Tant que la ferme n'est pas résolue, on ne peut pas dire où les graines
  // seront rangées — et l'ajout est bloqué le temps de le savoir.
  if (enAttente) {
    return (
      <p className="mb-6 rounded border-l-2 border-soil-500 py-2 pl-3 text-[13px] text-moss-400">
        Chargement de ta ferme…
      </p>
    );
  }

  if (source === "local") {
    return (
      <p className="mb-6 rounded border-l-2 border-soil-500 py-2 pl-3 text-[13px] leading-relaxed text-moss-400">
        Ces graines sont rangées dans <span className="text-moss-100">ce navigateur</span> et ne sont visibles
        que de toi.{" "}
        <Link href="/ferme" className="text-lamp-glow underline underline-offset-2">
          Crée ou rejoins une ferme
        </Link>{" "}
        pour les partager avec ton équipe.
      </p>
    );
  }

  return (
    <div className="mb-6 rounded border-l-2 border-lamp py-2 pl-3 text-[13px] leading-relaxed text-moss-400">
      Ces graines appartiennent à la ferme{" "}
      <span className="text-moss-100">{nomFerme}</span> : toute l&apos;équipe les voit.
      {!modifiable && <span className="text-ripe"> Tu es en lecture seule.</span>}
      {modifiable && (nbLocal ?? 0) > 0 && onTransferer && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-moss-200">
            {nbLocal} graine{(nbLocal ?? 0) > 1 ? "s" : ""} restent dans ton navigateur.
          </span>
          <button
            type="button"
            className="bouton"
            disabled={occupe}
            onClick={async () => {
              if (
                !confirm(
                  `Copier ${nbLocal} graine${(nbLocal ?? 0) > 1 ? "s" : ""} dans la ferme ?\n\nElles seront retirées de ce navigateur une fois la copie confirmée.`
                )
              ) {
                return;
              }
              setOccupe(true);
              const n = await onTransferer();
              setMessage(
                n > 0
                  ? `${n} graine${n > 1 ? "s" : ""} copiée${n > 1 ? "s" : ""} dans la ferme.`
                  : "Rien à copier."
              );
              setOccupe(false);
            }}
          >
            {occupe ? "Copie…" : "Les déplacer dans la ferme"}
          </button>
          {message && <span className="text-gene-g">{message}</span>}
        </div>
      )}
    </div>
  );
}
