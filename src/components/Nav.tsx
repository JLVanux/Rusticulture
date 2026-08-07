"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/scanner", label: "Scanner" },
  { href: "/genetique", label: "Mes graines" },
  { href: "/bac", label: "Gènes parfaits" },
  { href: "/rendement", label: "Rendement" },
  { href: "/thes", label: "Thés" },
  { href: "/tartes", label: "Tartes" },
  { href: "/poulailler", label: "Poulailler" },
  { href: "/minuteurs", label: "Minuteurs" },
  { href: "/raid", label: "Coût de raid" },
  { href: "/reglages", label: "Réglages" },
];

const RACCOURCIS = LIENS.filter((l) =>
  ["/scanner", "/bac", "/thes", "/minuteurs"].includes(l.href)
);

export default function Nav() {
  const chemin = usePathname();

  return (
    <>
      <aside className="hidden shrink-0 border-r border-soil-700 lg:block lg:w-56">
        <div className="sticky top-0 max-h-screen overflow-y-auto px-6 py-8">
          <Link href="/" className="group block">
            <div className="titre text-2xl leading-none transition group-hover:text-lamp-glow">LA SERRE</div>
          </Link>

          <nav className="mt-8">
            <ul className="space-y-0.5">
              {LIENS.map((lien) => {
                const actif = chemin === lien.href;
                return (
                  <li key={lien.href}>
                    <Link
                      href={lien.href}
                      aria-current={actif ? "page" : undefined}
                      className={`block rounded border-l-2 py-1.5 pl-3 pr-2 font-display text-[15px] font-semibold uppercase tracking-wide transition ${
                        actif
                          ? "border-lamp bg-lamp/10 text-moss-100"
                          : "border-transparent text-moss-400 hover:border-soil-500 hover:text-moss-100"
                      }`}
                    >
                      {lien.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-soil-700 px-4 py-3 lg:hidden">
        <Link href="/" className="titre text-xl">
          LA SERRE
        </Link>
        <Link href="/reglages" className="eyebrow hover:text-lamp-glow">
          Réglages
        </Link>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-soil-600 bg-soil-900/95 backdrop-blur lg:hidden">
        {RACCOURCIS.map((lien) => {
          const actif = chemin === lien.href;
          return (
            <Link
              key={lien.href}
              href={lien.href}
              aria-current={actif ? "page" : undefined}
              className={`py-3 text-center font-display text-[13px] font-semibold uppercase tracking-wide transition ${
                actif ? "text-lamp-glow" : "text-moss-400"
              }`}
            >
              {lien.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
