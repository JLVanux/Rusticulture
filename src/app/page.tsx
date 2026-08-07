import Link from "next/link";
import { LegendeGenes } from "@/components/Genes";
import { Details, Page } from "@/components/Ui";

const OUTILS = [
  { href: "/scanner", titre: "Scanner", texte: "Fait lire tes gènes à l'écran" },
  { href: "/bac", titre: "Gènes parfaits", texte: "L'assistant pas à pas" },
  { href: "/thes", titre: "Thés", texte: "Des thés voulus aux baies à planter" },
  { href: "/minuteurs", titre: "Minuteurs", texte: "Alerte au clonage et à la récolte" },
  { href: "/rendement", titre: "Rendement", texte: "Récolte et durée d'un cycle" },
  { href: "/tartes", titre: "Tartes", texte: "Amplifier un thé de minerai" },
  { href: "/poulailler", titre: "Poulailler", texte: "Œufs et cadence de ponte" },
  { href: "/raid", titre: "Coût de raid", texte: "Roquettes, C4, soufre" },
];

export default function Accueil() {
  return (
    <Page>
      <section className="pt-2">
        <div className="eyebrow">La règle qui décide de tout</div>
        <h1 className="titre mt-2 text-5xl leading-[0.95] sm:text-6xl">
          Deux verts battent
          <br />
          <span className="text-lamp-glow">un rouge.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-moss-200">
          Un G, un Y ou un H pèse <span className="font-mono text-moss-100">0,6</span>. Un W ou un X pèse{" "}
          <span className="font-mono text-moss-100">1,0</span>. Pour déloger un rouge, il te faut donc{" "}
          <span className="text-moss-100">deux donneurs verts identiques dans la même case</span> — 1,2 contre
          1,0. Un seul ne suffit jamais.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-moss-400">
          C&apos;est là que la plupart des sessions de croisement échouent. Le reste du site n&apos;est que
          l&apos;application de cette règle.
        </p>
      </section>

      <nav className="mt-12 grid grid-cols-2 gap-2">
        {OUTILS.map((o) => (
          <Link
            key={o.href}
            href={o.href}
            className="group rounded border border-soil-600 bg-soil-850 p-4 transition hover:border-lamp/60 hover:bg-soil-800"
          >
            <div className="font-display text-lg font-semibold uppercase tracking-wide text-moss-100 transition group-hover:text-lamp-glow">
              {o.titre}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-moss-400">{o.texte}</p>
          </Link>
        ))}
      </nav>

      <div className="mt-12">
        <Details titre="Les cinq gènes">
          <LegendeGenes />
        </Details>

        <Details titre="Fiabilité des chiffres">
          <p className="text-[14px] leading-relaxed text-moss-200">
            Les règles de croisement viennent des mécaniques du jeu : elles sont solides. Les durées de pousse
            et les rendements sont un modèle approché — Facepunch ne publie pas ses formules. Chronomètre un
            cycle en jeu et corrige les coefficients dans{" "}
            <Link href="/reglages" className="text-lamp-glow underline underline-offset-2">
              Réglages
            </Link>{" "}
            : tout le site se recale dessus.
          </p>
        </Details>
      </div>
    </Page>
  );
}
