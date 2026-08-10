"use client";

import { useEffect, useRef } from "react";

/**
 * Fenêtre modale.
 *
 * Quatre choses qu'une modale doit faire et qu'on oublie souvent :
 *
 * - **Se fermer avec Échap** et par clic sur le fond. Sans ça, on se sent
 *   piégé, surtout au clavier.
 * - **Bloquer le défilement de la page** derrière, sinon on fait défiler le
 *   fond en croyant faire défiler la fenêtre.
 * - **Prendre le focus à l'ouverture** et le rendre à la fermeture, pour qu'un
 *   utilisateur au clavier ne reparte pas du haut de la page.
 * - **Se dire au lecteur d'écran** : `role="dialog"` et `aria-modal`.
 *
 * Sur téléphone elle occupe le bas de l'écran plutôt que le centre : c'est là
 * qu'arrive le pouce, et le clavier virtuel ne la recouvre pas.
 */
export function Modale({
  titre,
  ouverte,
  onFermer,
  children,
}: {
  titre: string;
  ouverte: boolean;
  onFermer: () => void;
  children: React.ReactNode;
}) {
  const panneau = useRef<HTMLDivElement>(null);
  const precedent = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ouverte) return;

    precedent.current = document.activeElement as HTMLElement | null;
    const defilement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panneau.current?.focus();

    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);

    return () => {
      document.body.style.overflow = defilement;
      window.removeEventListener("keydown", surTouche);
      precedent.current?.focus();
    };
  }, [ouverte, onFermer]);

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-fond/90"
        onClick={onFermer}
      />

      <div
        ref={panneau}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col border border-trait bg-case outline-none sm:rounded-sm"
      >
        <div className="flex items-center gap-3 border-b border-trait px-5 py-3.5">
          <h2 className="titre text-lg">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-sm border border-trait text-cendre transition hover:border-trait-vif hover:text-craie"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </div>
      </div>
    </div>
  );
}
