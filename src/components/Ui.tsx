import type { ReactNode } from "react";

/** Largeur de lecture confortable. Les outils larges passent en `large`. */
export function Page({ children, large = false }: { children: ReactNode; large?: boolean }) {
  // Le texte suivi reste étroit — au-delà de ~75 caractères par ligne, l'œil
  // perd la ligne suivante. Mais une page entière en colonne unique oblige à
  // faire défiler pour comparer deux choses qui auraient dû être côte à côte.
  // D'où deux largeurs, et des grilles à l'intérieur.
  return <div className={`mx-auto w-full ${large ? "max-w-6xl" : "max-w-4xl"}`}>{children}</div>;
}

export function EnTetePage({ titre, intro }: { titre: string; intro?: string }) {
  return (
    <header className="mb-8">
      <h1 className="titre leading-[0.95]" style={{ fontSize: "var(--t-grand)" }}>
        {titre}
      </h1>
      {intro && (
        <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-feuille-400">{intro}</p>
      )}
    </header>
  );
}

/**
 * La réponse que la personne est venue chercher. Un seul bloc par page,
 * et c'est lui qui prend le plus de place.
 */
export function Reponse({
  valeur,
  unite,
  legende,
  secondaires,
}: {
  valeur: string;
  unite?: string;
  legende: string;
  secondaires?: { label: string; valeur: string }[];
}) {
  return (
    // Pas de halo, pas de coin coupé : l'emphase vient de la taille du chiffre
    // et d'un filet de rouille à gauche, comme un onglet de classeur.
    <div className="verre border-l-2 border-l-rouille p-5 sm:p-6">
      <div>
        <div
          className="chiffre break-words leading-[0.9] text-braise"
          style={{ fontSize: "var(--t-geant)" }}
        >
          {valeur}
          {unite && (
            <span className="ml-2 font-body text-[0.32em] font-semibold uppercase tracking-wider text-feuille-400">
              {unite}
            </span>
          )}
        </div>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-feuille-200">{legende}</p>

        {secondaires && secondaires.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.07] pt-4 sm:flex sm:flex-wrap sm:gap-x-10">
            {secondaires.map((s) => (
              <div key={s.label}>
                <dt className="eyebrow">{s.label}</dt>
                <dd className="chiffre mt-0.5 text-lg">{s.valeur}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/** En-tête de section : étiquette et filet, comme sur un plan technique. */
export function Section({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="filet mb-3">
      <h2 className="titre text-lg">{titre}</h2>
      {children}
    </div>
  );
}

/** Tout ce qui n'est pas la réponse principale se replie ici. */
export function Details({
  titre,
  children,
  ouvert = false,
}: {
  titre: string;
  children: ReactNode;
  ouvert?: boolean;
}) {
  return (
    <details className="group border-b border-white/[0.07]" open={ouvert}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-display text-[15px] font-semibold text-feuille-200 transition hover:text-feuille-100">
        {titre}
        <span className="font-mono text-lg leading-none text-feuille-400 transition group-open:rotate-45">+</span>
      </summary>
      <div className="pb-6 pt-1">{children}</div>
    </details>
  );
}

export function Champ({ label, children, aide }: { label: string; children: ReactNode; aide?: string }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{label}</div>
      {children}
      {aide && <p className="mt-1 text-[12px] text-feuille-400">{aide}</p>}
    </div>
  );
}

export function Note({ children, ton = "info" }: { children: ReactNode; ton?: "info" | "alerte" }) {
  return (
    <p
      className={`rounded-r-xl border-l-2 py-2.5 pl-3.5 text-[13.5px] leading-relaxed ${
        ton === "alerte" ? "border-mur bg-mur/10 text-feuille-200" : "border-white/15 bg-white/[0.02] text-feuille-400"
      }`}
    >
      {children}
    </p>
  );
}

export function Curseur({
  label,
  valeur,
  onChange,
  min = 0,
  max = 1,
  pas = 0.05,
  format,
}: {
  label: string;
  valeur: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  pas?: number;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="font-mono text-sm text-feuille-100">
          {format ? format(valeur) : `${Math.round(valeur * 100)} %`}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full"
      />
    </label>
  );
}

/** Groupe de boutons exclusifs — remplace les listes déroulantes quand il y a peu d'options. */
export function Choix<T extends string | number>({
  options,
  valeur,
  onChange,
}: {
  options: { label: string; valeur: T; icone?: ReactNode }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="rangee">
      {options.map((o) => (
        <button
          key={String(o.valeur)}
          type="button"
          onClick={() => onChange(o.valeur)}
          className={`inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-sm border px-4 font-display text-[13px] font-semibold transition ${
            valeur === o.valeur
              ? "border-rouille bg-rouille/15 text-braise"
              : "border-trait text-cendre hover:border-trait-vif hover:text-craie"
          }`}
        >
          {o.icone}
          {o.label}
        </button>
      ))}
    </div>
  );
}
