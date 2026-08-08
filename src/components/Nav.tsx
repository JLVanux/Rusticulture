"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const GROUPES: { titre: string; liens: { href: string; label: string }[] }[] = [
  {
    titre: "",
    liens: [{ href: "/ferme", label: "Ma ferme" }],
  },
  {
    titre: "Génétique",
    liens: [
      { href: "/scanner", label: "Scanner" },
      { href: "/genetique", label: "Mes graines" },
      { href: "/bac", label: "Gènes parfaits" },
    ],
  },
  {
    titre: "Production",
    liens: [
      { href: "/rendement", label: "Rendement" },
      { href: "/thes", label: "Thés" },
      { href: "/tartes", label: "Tartes" },
      { href: "/poulailler", label: "Poulailler" },
    ],
  },
  {
    titre: "Sur le terrain",
    liens: [
      { href: "/minuteurs", label: "Minuteurs" },
      { href: "/raid", label: "Coût de raid" },
    ],
  },
  {
    titre: "",
    liens: [
      { href: "/reglages", label: "Réglages" },
      { href: "/connexion", label: "Compte" },
    ],
  },
];

function Logo({ taille = "text-2xl" }: { taille?: string }) {
  return (
    <span className={`titre leading-none ${taille}`}>
      <span className="text-lamp-glow">RUSTI</span>
      <span className="text-moss-100">CULTURE</span>
    </span>
  );
}

export default function Nav() {
  const chemin = usePathname();
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  // Naviguer ferme le tiroir, sinon il reste ouvert par-dessus la page d'arrivée.
  useEffect(() => setTiroirOuvert(false), [chemin]);

  useEffect(() => {
    if (!tiroirOuvert) return;
    const surEchap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTiroirOuvert(false);
    };
    // On bloque le défilement du fond pendant que le tiroir est ouvert.
    const ancienOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", surEchap);
    return () => {
      document.body.style.overflow = ancienOverflow;
      window.removeEventListener("keydown", surEchap);
    };
  }, [tiroirOuvert]);

  return (
    <>
      {/* Colonne fixe — écrans larges */}
      <aside className="hidden shrink-0 border-r border-soil-700 lg:block lg:w-56">
        <div className="sticky top-0 max-h-screen overflow-y-auto px-6 py-8">
          <Link href="/" className="group block">
            <Logo />
          </Link>

          <nav className="mt-8 space-y-6">
            {GROUPES.map((groupe, i) => (
              <div key={i}>
                {groupe.titre && <div className="eyebrow mb-1.5">{groupe.titre}</div>}
                <ul className="space-y-0.5">
                  {groupe.liens.map((lien) => (
                    <li key={lien.href}>
                      <LienNav href={lien.href} label={lien.label} actif={chemin === lien.href} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* En-tête — mobile et tablette */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-soil-700 bg-soil-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/">
          <Logo taille="text-xl" />
        </Link>
        <button
          type="button"
          onClick={() => setTiroirOuvert(true)}
          aria-expanded={tiroirOuvert}
          aria-label="Ouvrir le menu"
          className="flex items-center gap-2 rounded border border-soil-500 px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wider text-moss-100 transition hover:border-lamp/60"
        >
          <span className="flex flex-col gap-[3px]" aria-hidden>
            <span className="block h-[2px] w-4 bg-current" />
            <span className="block h-[2px] w-4 bg-current" />
            <span className="block h-[2px] w-4 bg-current" />
          </span>
          Menu
        </button>
      </header>

      {/* Tiroir — accès à toutes les pages */}
      {tiroirOuvert && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-soil-900/80 backdrop-blur-sm"
            onClick={() => setTiroirOuvert(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col border-l border-soil-600 bg-soil-850">
            <div className="flex items-center justify-between border-b border-soil-700 px-5 py-4">
              <Logo taille="text-xl" />
              <button
                type="button"
                onClick={() => setTiroirOuvert(false)}
                aria-label="Fermer le menu"
                className="rounded border border-soil-500 px-2.5 py-1 font-mono text-lg leading-none text-moss-200 transition hover:border-lamp/60 hover:text-lamp-glow"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
              {GROUPES.map((groupe, i) => (
                <div key={i}>
                  {groupe.titre && <div className="eyebrow mb-1.5">{groupe.titre}</div>}
                  <ul className="space-y-0.5">
                    {groupe.liens.map((lien) => (
                      <li key={lien.href}>
                        <LienNav
                          href={lien.href}
                          label={lien.label}
                          actif={chemin === lien.href}
                          grand
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

    </>
  );
}

function LienNav({
  href,
  label,
  actif,
  grand,
}: {
  href: string;
  label: string;
  actif: boolean;
  grand?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={`block rounded border-l-2 pl-3 pr-2 font-display font-semibold uppercase tracking-wide transition ${
        grand ? "py-2.5 text-base" : "py-1.5 text-[15px]"
      } ${
        actif
          ? "border-lamp bg-lamp/10 text-moss-100"
          : "border-transparent text-moss-400 hover:border-soil-500 hover:text-moss-100"
      }`}
    >
      {label}
    </Link>
  );
}
