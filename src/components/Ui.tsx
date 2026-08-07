import type { ReactNode } from "react";

/** Largeur de lecture confortable. Les outils larges passent en `large`. */
export function Page({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return <div className={`mx-auto w-full ${large ? "max-w-4xl" : "max-w-2xl"}`}>{children}</div>;
}

export function EnTetePage({ titre, intro }: { titre: string; intro?: string }) {
  return (
    <header className="mb-8">
      <h1 className="titre text-4xl leading-none sm:text-5xl">{titre}</h1>
      {intro && <p className="mt-3 text-[15px] leading-relaxed text-moss-400">{intro}</p>}
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
    <div className="rounded-lg border border-lamp/40 bg-lamp/8 p-6">
      <div className="break-words font-display text-5xl font-bold leading-none text-lamp-glow sm:text-6xl md:text-7xl">
        {valeur}
        {unite && <span className="ml-2 text-2xl font-medium text-moss-400">{unite}</span>}
      </div>
      <p className="mt-2 text-[15px] text-moss-200">{legende}</p>

      {secondaires && secondaires.length > 0 && (
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-lamp/20 pt-4">
          {secondaires.map((s) => (
            <div key={s.label}>
              <dt className="eyebrow">{s.label}</dt>
              <dd className="font-mono text-lg text-moss-100">{s.valeur}</dd>
            </div>
          ))}
        </dl>
      )}
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
    <details className="group border-b border-soil-700" open={ouvert}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-3.5 font-display text-base font-semibold uppercase tracking-wide text-moss-200 transition hover:text-moss-100">
        {titre}
        <span className="font-mono text-lg leading-none text-moss-400 transition group-open:rotate-45">+</span>
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
      {aide && <p className="mt-1 text-[12px] text-moss-400">{aide}</p>}
    </div>
  );
}

export function Note({ children, ton = "info" }: { children: ReactNode; ton?: "info" | "alerte" }) {
  return (
    <p
      className={`rounded border-l-2 py-2 pl-3 text-[13px] leading-relaxed ${
        ton === "alerte" ? "border-ripe bg-ripe/8 text-moss-200" : "border-soil-500 text-moss-400"
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
        <span className="font-mono text-sm text-moss-100">
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
  options: { label: string; valeur: T }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={String(o.valeur)}
          type="button"
          onClick={() => onChange(o.valeur)}
          className={`rounded border px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide transition ${
            valeur === o.valeur
              ? "border-lamp bg-lamp/15 text-lamp-glow"
              : "border-soil-600 text-moss-400 hover:border-soil-500 hover:text-moss-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
