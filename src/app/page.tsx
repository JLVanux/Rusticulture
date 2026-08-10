import Link from "next/link";
import { DemoBac } from "@/components/DemoBac";
import { IconePlante } from "@/components/IconePlante";
import {
  IconeCadre,
  IconeCloche,
  IconeExplosion,
  IconeGenes,
  IconeHorloge,
  IconePanier,
  IconePousse,
  IconeTasse,
} from "@/components/IconesOutils";
import { MessagesDiscord } from "@/components/MessagesDiscord";
import { Details, Page } from "@/components/Ui";
import { PLANTES } from "@/data/game";
import { calculerDemo } from "@/lib/demo";

/**
 * L'accueil.
 *
 * Trois sections, pas six. La version précédente disait deux fois la même chose
 * — « tu plantes → Discord prévient → tu récoltes » puis « du clone à la
 * récolte parfaite » — et noyait le message sous le texte.
 *
 * Règle tenue ici : une ligne par carte. Si une idée demande trois phrases,
 * c'est qu'elle a sa place sur sa propre page, pas sur l'accueil.
 */

const ETAPES = [
  { icone: <IconePousse />, titre: "Tu plantes" },
  { icone: <IconeHorloge />, titre: "Le site calcule" },
  { icone: <IconeCloche />, titre: "Discord te prévient" },
  { icone: <IconePanier />, titre: "Tu récoltes" },
];

const OUTILS = [
  {
    href: "/minuteurs",
    icone: <IconeCloche />,
    titre: "Programmer une récolte",
    texte: "Une alerte Discord quand c'est prêt.",
    majeur: true,
  },
  {
    href: "/bac",
    icone: <IconeGenes />,
    titre: "Créer un génome parfait",
    texte: "La disposition exacte de ton bac.",
  },
  {
    href: "/scanner",
    icone: <IconeCadre />,
    titre: "Scanner mes clones",
    texte: "Tes gènes lus à l'écran.",
  },
  {
    href: "/rendement",
    icone: <IconePousse />,
    titre: "Calculer ma production",
    texte: "Ce que ta ferme rapporte par heure.",
  },
  {
    href: "/thes",
    icone: <IconeTasse />,
    titre: "Produire des thés",
    texte: "Les baies qu'il te faut.",
  },
  {
    href: "/raid",
    icone: <IconeExplosion />,
    titre: "Préparer un raid",
    texte: "Tes cibles converties en soufre.",
  },
];

export default function Accueil() {
  const demo = calculerDemo();
  const cultures = PLANTES.filter((p) => p.categorie !== "nourriture");

  return (
    <Page large>
      {/* ── Ce que c'est, et ce qu'on obtient ────────────────────────
          Un hero qui annonce sans rien montrer ne convainc personne. La
          promesse à gauche, la preuve à droite : le message tel qu'il arrive
          vraiment dans le salon. */}
      <section className="pt-1">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-12">
          <div>
            <div className="eyebrow">Agriculture · Rust · en français</div>
            <h1 className="titre mt-3 leading-[0.92]" style={{ fontSize: "var(--t-geant)" }}>
              Va jouer.
              <br />
              <span className="text-braise">On te prévient.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-craie">
              Lance ta culture, retourne au jeu. RustiCulture calcule tes croisements et envoie le
              message dans ton salon Discord quand la récolte est prête.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/minuteurs" className="bouton bouton-primaire">
                Programmer une récolte
              </Link>
              <Link href="/bac" className="bouton">
                Créer un génome parfait
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-poussiere">
              Gratuit, sans publicité. Les calculateurs marchent sans compte.
            </p>
          </div>

          <MessagesDiscord immediat />
        </div>
      </section>

      {/* ── Le principe, en quatre pictogrammes ───────────────────────── */}
      <section className="mt-10">
        <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-trait bg-trait lg:grid-cols-4">
          {ETAPES.map((e) => (
            <li key={e.titre} className="flex flex-col items-center gap-2 bg-case px-3 py-5 text-center">
              <span className="text-braise">{e.icone}</span>
              <span className="font-display text-[14px] font-bold leading-tight text-craie">
                {e.titre}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Les outils ────────────────────────────────────────────────── */}
      <section className="mt-14">
        <div className="filet mb-4">
          <h2 className="titre text-2xl">Que veux-tu faire ?</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OUTILS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className={`group flex items-center gap-4 rounded-sm border p-4 transition duration-150 hover:-translate-y-0.5 ${
                o.majeur
                  ? "border-rouille bg-case-haute hover:border-braise sm:col-span-2 lg:col-span-1"
                  : "border-trait bg-case hover:border-trait-vif"
              }`}
            >
              <span className={`shrink-0 ${o.majeur ? "text-braise" : "text-cendre"}`}>
                {o.icone}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-[15px] font-bold leading-tight text-craie">
                  {o.titre}
                </span>
                <span className="mt-0.5 block text-[13px] leading-snug text-cendre">{o.texte}</span>
              </span>
              <span
                className={`ml-auto shrink-0 font-display text-lg ${
                  o.majeur ? "text-braise" : "text-poussiere group-hover:text-craie"
                }`}
                aria-hidden
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Brancher Discord ──────────────────────────────────────── */}
      <section className="mt-14">
        <div className="verre flex flex-wrap items-center gap-5 border-l-2 border-l-rouille p-5">
          <div className="min-w-0 flex-1">
            <h2 className="titre text-xl leading-tight">Un webhook, deux minutes</h2>
            <p className="mt-1.5 text-[14px] leading-relaxed text-cendre">
              Tu le crées dans le salon de ton choix, tu colles l&apos;adresse dans les réglages de ta
              ferme. Aucun bot à installer, aucun accès à ton serveur.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/aide" className="bouton bouton-primaire">
              Comment faire
            </Link>
            <Link href="/connexion" className="bouton">
              Créer ma ferme
            </Link>
          </div>
        </div>
      </section>

      {/* ── La preuve ─────────────────────────────────────────────────── */}
      <section className="mt-14">
        <div className="filet mb-4">
          <h2 className="titre text-2xl">Deux verts battent un rouge</h2>
        </div>
        <p className="mb-4 max-w-2xl text-[15px] leading-relaxed text-cendre">
          Un gène vert pèse <span className="chiffre text-craie">0,6</span>, un rouge{" "}
          <span className="chiffre text-craie">1,0</span>. Il en faut donc deux dans la même case pour
          le déloger — <span className="chiffre text-craie">1,2</span> contre{" "}
          <span className="chiffre text-craie">1,0</span>. Voilà ce que ça donne.
        </p>

        <DemoBac demo={demo} />
      </section>

      {/* ── Le reste, replié ──────────────────────────────────────────── */}
      <div className="mt-10">
        <Details titre="D'où viennent les chiffres">
          <p className="text-[14px] leading-relaxed text-cendre">
            Les probabilités de croisement sont calculées exactement, case par case, pas simulées. Les
            durées de pousse sont un modèle approché : chronomètre un cycle en jeu et corrige-le dans{" "}
            <Link href="/reglages" className="text-braise underline underline-offset-2">
              Réglages
            </Link>
            , tout le site se recale.
          </p>
        </Details>

        <Details titre="Ce que le site ne fait pas">
          <p className="text-[14px] leading-relaxed text-cendre">
            Il ne lit pas ta partie et ne se connecte à aucun serveur. Tout ce qu&apos;il sait vient de
            toi, ou du scanner qui lit ton écran sur ta machine.
          </p>
        </Details>
      </div>
    </Page>
  );
}
