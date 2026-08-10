"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/bases";

/**
 * Navigation.
 *
 * Dix-sept entrées, c'était trop. Trois s'en vont sans qu'aucune page ne
 * disparaisse :
 *
 * - **Scanner** est mis en avant sur ORDINATEUR et retiré de la barre du pouce :
 *   le partage d'écran n'existe pas sur téléphone, et de toute façon on joue à
 *   Rust sur PC. L'inverse avait été fait par réflexe, sans regarder où la
 *   fonctionnalité peut réellement servir.
 * - **Wipes** descend dans l'administration. On clôture un wipe une fois par
 *   serveur : c'est un réglage, pas une consultation quotidienne.
 * - **Confidentialité** passe en pied de page, comme partout ailleurs.
 *
 * Sur téléphone, la barre est EN BAS. C'est là que le pouce arrive quand on
 * tient l'appareil d'une main — un menu en haut d'un écran de 6 pouces oblige
 * à changer de prise. Quatre destinations quotidiennes, plus un accès au reste.
 *
 * Ce choix revient sur une décision antérieure : la barre du bas avait été
 * retirée parce qu'elle faisait doublon avec le tiroir. Le doublon venait de ce
 * qu'elle proposait les mêmes entrées ; ici elle sert de raccourci et le tiroir
 * de catalogue.
 */

const GROUPES: { titre: string; liens: { href: string; label: string }[] }[] = [
  {
    titre: "Ma ferme",
    liens: [
      { href: "/ferme", label: "Tableau de bord" },
      { href: "/statistiques", label: "Statistiques" },
      { href: "/equipe", label: "Équipe" },
    ],
  },
  {
    titre: "Génétique",
    liens: [
      { href: "/bac", label: "Gènes parfaits" },
      { href: "/scanner", label: "Scanner l'écran" },
      { href: "/genetique", label: "Mes graines" },
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
      { href: "/bases", label: "Bases de farm" },
      { href: "/raid", label: "Coût de raid" },
    ],
  },
  {
    titre: "",
    liens: [
      { href: "/connexion", label: "Mon compte" },
      { href: "/wipes", label: "Wipes" },
      { href: "/reglages", label: "Réglages" },
      { href: "/aide", label: "Aide" },
    ],
  },
];

const RACCOURCIS = [
  { href: "/ferme", label: "Ferme", icone: <IconeFerme /> },
  { href: "/bac", label: "Gènes", icone: <IconeGrille /> },
  { href: "/minuteurs", label: "Minuteurs", icone: <IconeMinuteur /> },
  { href: "/genetique", label: "Graines", icone: <IconeGraine /> },
];

export default function Nav() {
  const chemin = usePathname();
  const [tiroir, setTiroir] = useState(false);
  // L'entrée n'apparaît que pour un administrateur. Ce n'est qu'un confort :
  // la page elle-même refuse l'accès, et les politiques de la base refusent
  // toute écriture — masquer un lien n'a jamais protégé quoi que ce soit.
  const { admin } = useAdmin();

  const groupes = admin
    ? [
        ...GROUPES.slice(0, -1),
        {
          titre: "",
          liens: [...GROUPES[GROUPES.length - 1].liens, { href: "/admin", label: "Administration" }],
        },
      ]
    : GROUPES;

  useEffect(() => setTiroir(false), [chemin]);

  useEffect(() => {
    if (!tiroir) return;
    const surEchap = (e: KeyboardEvent) => e.key === "Escape" && setTiroir(false);
    const ancien = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", surEchap);
    return () => {
      document.body.style.overflow = ancien;
      window.removeEventListener("keydown", surEchap);
    };
  }, [tiroir]);

  return (
    <>
      {/* Colonne fixe — écrans larges */}
      <aside className="hidden shrink-0 border-r border-trait lg:block lg:w-60">
        <div className="sticky top-0 max-h-screen overflow-y-auto px-5 py-7">
          <Link href="/" className="group block px-2">
            <Logo />
          </Link>
          <nav className="mt-8 space-y-6">
            {groupes.map((g, i) => (
              <div key={i}>
                {g.titre && <div className="eyebrow mb-1.5 px-3">{g.titre}</div>}
                <ul className="space-y-0.5">
                  {g.liens.map((l) => (
                    <li key={l.href}>
                      <LienNav {...l} actif={chemin === l.href} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* En-tête compact — mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-trait bg-fond px-4 py-3 lg:hidden">
        <Link href="/">
          <Logo petit />
        </Link>
        <Link href="/aide" className="eyebrow py-2">
          Aide
        </Link>
      </header>

      {/* Tiroir complet */}
      {tiroir && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-fond/90"
            onClick={() => setTiroir(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto border-t border-trait bg-case pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Poignée : indique qu'on peut fermer en glissant, et donne une
                zone de préhension au pouce. */}
            <div className="sticky top-0 z-10 flex justify-center bg-case pb-2 pt-3">
              <span className="h-1 w-10 rounded-sm bg-trait-vif" aria-hidden />
            </div>
            <nav className="grid gap-6 px-5 pt-2 sm:grid-cols-2">
              {groupes.map((g, i) => (
                <div key={i}>
                  {g.titre && <div className="eyebrow mb-1.5 px-3">{g.titre}</div>}
                  <ul className="space-y-0.5">
                    {g.liens.map((l) => (
                      <li key={l.href}>
                        <LienNav {...l} actif={chemin === l.href} grand />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Barre du pouce */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-trait bg-fond lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {RACCOURCIS.map((r) => {
          const actif = chemin === r.href;
          return (
            <Link
              key={r.href}
              href={r.href}
              aria-current={actif ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 transition ${
                actif ? "text-braise" : "text-poussiere"
              }`}
            >
              <span aria-hidden>{r.icone}</span>
              <span className="font-display text-[11px] font-semibold uppercase tracking-wide">
                {r.label}
              </span>
              {actif && <span className="absolute inset-x-0 top-0 h-0.5 bg-rouille" aria-hidden />}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setTiroir(true)}
          aria-expanded={tiroir}
          aria-label="Ouvrir le menu"
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-poussiere transition active:text-craie"
        >
          <span aria-hidden>
            <IconePlus />
          </span>
          <span className="font-display text-[11px] font-semibold uppercase tracking-wide">Plus</span>
        </button>
      </nav>
    </>
  );
}

function Logo({ petit }: { petit?: boolean }) {
  return (
    <span className={`titre leading-none ${petit ? "text-xl" : "text-2xl"}`}>
      <span className="text-braise">Rusti</span>
      <span className="text-craie">Culture</span>
    </span>
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
      className={`block rounded-lg px-3 font-display font-semibold uppercase tracking-wide transition ${
        grand ? "py-2.5 text-[15px]" : "py-2 text-[14px]"
      } ${
        actif
          ? "bg-case-haute text-braise"
          : "text-cendre hover:bg-case hover:text-craie"
      }`}
    >
      {label}
    </Link>
  );
}

/* Icônes tracées à la main : quatre traits chacune, aucune dépendance, et
   elles suivent la couleur du texte. */
const trait = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconeFerme() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...trait}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 10v9h14v-9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

function IconeGrille() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...trait}>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="15" width="6" height="6" rx="1.5" />
      <rect x="15" y="15" width="6" height="6" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconeMinuteur() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...trait}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M9 2h6" />
    </svg>
  );
}

function IconeGraine() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...trait}>
      <path d="M12 21c-4 0-7-3-7-7 0-5 4-9 9-11 1 6-1 11-5 13" />
      <path d="M8 20c1-4 3-7 6-9" />
    </svg>
  );
}

function IconeScanner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...trait}>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
      <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
      <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M4 12h16" />
    </svg>
  );
}

function IconePlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" {...trait}>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
