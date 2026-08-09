"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Apparition à l'entrée dans l'écran.
 *
 * Volontairement minime : huit pixels et une opacité, une seule fois, jamais en
 * boucle. Un site qui fait glisser chaque bloc depuis les bords se regarde au
 * lieu de se lire, et le procédé se démode vite.
 *
 * Sous `prefers-reduced-motion`, le contenu est simplement là.
 */
export function Reveal({
  children,
  delai = 0,
  className = "",
}: {
  children: React.ReactNode;
  delai?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const sobre = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sobre || !ref.current) {
      setVu(true);
      return;
    }

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVu(true);
          observateur.disconnect();
        }
      },
      { rootMargin: "-40px" }
    );
    observateur.observe(ref.current);
    return () => observateur.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out ${
        vu ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delai}ms` }}
    >
      {children}
    </div>
  );
}
