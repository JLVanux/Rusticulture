import Link from "next/link";

/**
 * Les pages qui prolongent celle qu'on vient de lire.
 *
 * Le site s'est construit page par page, chacune répondant à sa question sans
 * jamais renvoyer aux autres. Or les questions s'enchaînent : on calcule un
 * rendement puis on veut savoir combien de baies pour un thé, on obtient une
 * génétique puis on veut la planter. Sans ces passerelles, chaque page est une
 * impasse et l'utilisateur retourne au menu.
 */
export function VoirAussi({
  liens,
}: {
  liens: { href: string; label: string; detail: string }[];
}) {
  return (
    <section className="mt-12">
      <div className="filet mb-3">
        <h2 className="titre text-lg">Pour aller plus loin</h2>
      </div>
      <ul className="grid gap-px overflow-hidden rounded-sm border border-trait bg-trait sm:grid-cols-2">
        {liens.map((l) => (
          <li key={l.href} className="bg-case transition hover:bg-case-haute">
            <Link href={l.href} className="block p-4">
              <span className="font-display text-[15px] font-bold text-craie">
                {l.label} <span className="text-braise">→</span>
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-cendre">{l.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
