import Link from "next/link";
import { DemoBac } from "@/components/DemoBac";
import { LegendeGenes } from "@/components/Genes";
import { MessagesDiscord } from "@/components/MessagesDiscord";
import { Reveal } from "@/components/Reveal";
import { Details, Page } from "@/components/Ui";
import { calculerDemo } from "@/lib/demo";

const PROBLEMES = [
  {
    titre: "Des heures de croisement pour rien",
    texte:
      "Tu remplis un bac au jugé, tu attends deux heures, il ne sort rien. Il fallait deux donneuses vertes identiques dans la même case.",
    reponse: "La disposition exacte des neuf emplacements, et tes chances réelles.",
  },
  {
    titre: "Ta meilleure graine détruite par ses voisines",
    texte:
      "Les plants se réécrivent mutuellement. Un GGGYYY parfait entouré de graines sauvages est détruit à coup sûr.",
    reponse: "Le calcul de dérive : ce qu'un plant risque de perdre, avant que tu ne plantes.",
  },
  {
    titre: "Des récoltes qui pourrissent",
    texte:
      "Un cycle dure plus d'une heure, puis le plant dépérit. Rien dans le jeu ne te rappelle d'y revenir.",
    reponse: "Un message Discord au moment précis où il faut y retourner.",
  },
  {
    titre: "Une équipe qui travaille en double",
    texte:
      "À quatre sur un wipe, chacun plante dans son coin. Personne ne sait ce que l'équipe possède.",
    reponse: "Une ferme commune : mêmes graines, mêmes minuteurs, mêmes chiffres.",
  },
];

const APPORTS = [
  {
    titre: "Une génétique parfaite plus vite",
    texte:
      "Quand la cible n'est pas atteignable d'un coup, le site cherche la route en plusieurs générations et compare les chemins par le nombre de cycles attendus. La réponse n'est jamais « impossible », c'est « voilà par où passer ».",
  },
  {
    titre: "Savoir si ta ferme est bonne",
    texte:
      "Le site estime ce que ta configuration devrait produire. Tu enregistres ce que tu récoltes vraiment. L'écart dit où tu perds du temps — presque toujours en replantant trop tard.",
  },
  {
    titre: "Une réponse quand tu ouvres le site",
    texte:
      "Pas un tableau à déchiffrer : l'action la plus rentable du moment, avec le fait qui la déclenche. « Tu as quatre graines meilleures que celles du bac 3 : les replanter te ferait gagner 22 %. »",
  },
  {
    titre: "Les calculs pénibles, faits",
    texte:
      "Combien de baies pour douze thés purs. Combien de soufre pour percer une porte blindée. Des règles de trois que personne n'a envie de poser en jouant.",
  },
];

const OUTILS = [
  {
    titre: "Génétique",
    texte:
      "Tes graines, ta cible, la disposition du bac avec la justification case par case. Et un scanner qui lit les gènes directement à l'écran.",
    liens: [
      { href: "/bac", label: "Gènes parfaits" },
      { href: "/scanner", label: "Scanner" },
      { href: "/genetique", label: "Mes graines" },
    ],
  },
  {
    titre: "Production",
    texte:
      "Tissu par heure selon les gènes. Baies nécessaires pour les thés visés. Ce que la tarte à l'ours ajoute vraiment. La cadence du poulailler.",
    liens: [
      { href: "/rendement", label: "Rendement" },
      { href: "/thes", label: "Thés" },
      { href: "/tartes", label: "Tartes" },
      { href: "/poulailler", label: "Poulailler" },
    ],
  },
  {
    titre: "Sur le terrain",
    texte:
      "Des minuteurs partagés qui disent quand revenir, et un calculateur de raid qui convertit tes cibles en soufre, donc en heures de minage.",
    liens: [
      { href: "/minuteurs", label: "Minuteurs" },
      { href: "/raid", label: "Coût de raid" },
    ],
  },
];

export default function Accueil() {
  // Calculée par le moteur du site : ce que la démonstration affiche est ce que
  // l'outil produirait.
  const demo = calculerDemo();

  return (
    <Page large>
      {/* ── L'accroche et la preuve, ensemble ─────────────────────────── */}
      <section className="pt-1">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10">
          <div>
            <div className="eyebrow">Agriculture · Rust · en français</div>
            <h1 className="titre mt-3 leading-[0.92]" style={{ fontSize: "var(--t-geant)" }}>
              Arrête de croiser
              <br />
              <span className="text-braise">au hasard.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-craie">
              RustiCulture calcule la disposition exacte de ton bac, suit ta production, et prévient ton
              équipe sur Discord quand il faut retourner aux plants.
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <Link href="/bac" className="bouton bouton-primaire">
                Essayer avec mes graines
              </Link>
              <Link href="/connexion" className="bouton">
                Créer ma ferme
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-poussiere">
              Gratuit, sans publicité. Les calculateurs marchent sans compte.
            </p>
          </div>

          <DemoBac demo={demo} />
        </div>
      </section>

      {/* ── La douleur ────────────────────────────────────────────────
          Quatre lignes pleine largeur plutôt qu'une grille de cartes : le
          problème à gauche, la réponse à droite, séparés par un filet. On lit
          en diagonale et on comprend, ce qu'une grille dense empêche. */}
      <section className="mt-28">
        <Reveal>
          <div className="filet mb-2">
            <h2 className="titre text-2xl">Ce que ça règle</h2>
          </div>
        </Reveal>

        <ul>
          {PROBLEMES.map((p, i) => (
            <Reveal key={p.titre} delai={i * 70}>
              <li className="grid gap-3 border-b border-trait py-7 lg:grid-cols-[3rem_1fr_1fr] lg:items-start lg:gap-8">
                <span className="chiffre text-3xl leading-none text-trait-vif">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="titre text-xl leading-tight">{p.titre}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-cendre">{p.texte}</p>
                </div>
                <p className="border-l-2 border-l-rouille pl-4 text-[15px] leading-relaxed text-craie lg:mt-1">
                  {p.reponse}
                </p>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ── Discord ───────────────────────────────────────────────────── */}
      <section className="mt-28">
        <Reveal>
          <div className="verre border-l-2 border-l-rouille p-5 sm:p-6">
            <div className="grid gap-7 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <div className="eyebrow">Sur ton propre serveur</div>
                <h2 className="titre mt-2 text-3xl leading-tight">
                  Ton équipe prévenue, site fermé.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-cendre">
                  Tu crées un webhook dans le salon de ton choix, tu colles l&apos;adresse, c&apos;est
                  fini. Aucun bot à installer, aucune permission à accorder, aucun accès à ton serveur.
                  Chaque ferme a le sien.
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-cendre">
                  Jeu en plein écran, téléphone rangé : le message arrive quand même.
                </p>
                <Link href="/aide" className="bouton mt-5 inline-flex">
                  Comment le brancher
                </Link>
              </div>

              <MessagesDiscord />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Ce que ça apporte ─────────────────────────────────────────── */}
      <section className="mt-28">
        <Reveal>
          <div className="filet mb-4">
            <h2 className="titre text-2xl">Ce que ça apporte</h2>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2">
          {APPORTS.map((a, i) => (
            <Reveal key={a.titre} delai={i * 70}>
              <article className="panneau h-full p-6">
                <h3 className="titre text-xl leading-tight">{a.titre}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-cendre">{a.texte}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Le compte ─────────────────────────────────────────────────── */}
      <section className="mt-28">
        <Reveal>
          <div className="verre p-5 sm:p-6">
            <div className="grid gap-7 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <div className="eyebrow">Jouer à plusieurs</div>
                <h2 className="titre mt-2 text-3xl leading-tight">
                  Une ferme, toute l&apos;équipe dedans.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-cendre">
                  Le propriétaire crée la ferme et donne un code. Chacun rejoint, et tout devient commun :
                  graines, minuteurs, bacs, récoltes, objectifs, statistiques du wipe.
                </p>
                <p className="mt-3 text-[15px] leading-relaxed text-cendre">
                  Un pseudo, un mot de passe. Aucune adresse e-mail demandée, aucun message envoyé.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/connexion" className="bouton bouton-primaire">
                    Créer un compte
                  </Link>
                  <Link href="/connexion" className="bouton">
                    J&apos;en ai déjà un
                  </Link>
                </div>
              </div>

              <ul className="grid gap-px overflow-hidden rounded-sm border border-trait bg-trait sm:grid-cols-2 lg:grid-cols-1">
                {[
                  [
                    "Trois rôles",
                    "Propriétaire, membre, lecture seule — appliqués par la base, pas par l'interface.",
                  ],
                  [
                    "Estimé contre réel",
                    "Ce que ta ferme devrait produire, ce qu'elle produit vraiment, et l'écart.",
                  ],
                  [
                    "Un wipe à la fois",
                    "Objectifs et statistiques sur toute la durée, puis un résumé et on repart à zéro.",
                  ],
                ].map(([t, d]) => (
                  <li key={t} className="bg-case p-3.5">
                    <div className="font-display text-[14px] font-bold text-craie">{t}</div>
                    <div className="mt-1 text-[13px] leading-snug text-cendre">{d}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Les outils ────────────────────────────────────────────────── */}
      <section className="mt-28">
        <Reveal>
          <div className="filet mb-4">
            <h2 className="titre text-2xl">Les outils</h2>
          </div>
        </Reveal>
        <div className="grid gap-4 lg:grid-cols-3">
          {OUTILS.map((o, i) => (
            <Reveal key={o.titre} delai={i * 60}>
              <article className="panneau flex h-full flex-col p-6">
                <h3 className="titre text-xl leading-tight">{o.titre}</h3>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-cendre">{o.texte}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {o.liens.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-sm border border-trait px-2.5 py-1.5 font-display text-[13px] font-semibold text-cendre transition hover:border-trait-vif hover:text-craie"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Le reste ──────────────────────────────────────────────────── */}
      <div className="mt-16">
        <Details titre="La règle qui décide de tout">
          <p className="text-[14px] leading-relaxed text-cendre">
            Un G, un Y ou un H pèse <span className="chiffre text-craie">0,6</span>. Un W ou un X pèse{" "}
            <span className="chiffre text-craie">1,0</span>. Un gène n&apos;est remplacé que si le poids
            cumulé de ses donneuses dépasse <span className="text-craie">strictement</span> celui du gène en
            place. Il faut donc deux donneuses vertes identiques pour déloger un rouge — 1,2 contre 1,0 — et
            une seule ne suffira jamais.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-cendre">
            C&apos;est là que la plupart des sessions de croisement échouent. Tout le reste du site
            n&apos;est que l&apos;application de cette règle.
          </p>
        </Details>

        <Details titre="Les cinq gènes">
          <LegendeGenes />
        </Details>

        <Details titre="D'où viennent les chiffres">
          <p className="text-[14px] leading-relaxed text-cendre">
            Les règles de croisement viennent des mécaniques du jeu : les probabilités sont calculées
            exactement, case par case, pas simulées.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-cendre">
            Les durées de pousse et les rendements sont un modèle approché — Facepunch ne publie pas ses
            formules et les sources se contredisent du simple au double. Chronomètre un cycle en jeu et
            corrige les coefficients dans{" "}
            <Link href="/reglages" className="text-braise underline underline-offset-2">
              Réglages
            </Link>
            : tout le site se recale dessus.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-cendre">
            Une estimation n&apos;est jamais présentée comme une observation. Quand le site n&apos;est pas
            sûr, il le dit.
          </p>
        </Details>

        <Details titre="Ce que le site ne fait pas">
          <p className="text-[14px] leading-relaxed text-cendre">
            Il ne lit pas ta partie et ne se connecte à aucun serveur Rust. Tout ce qu&apos;il sait, c&apos;est
            ce que tu lui dis — ou ce que le scanner lit à l&apos;écran, sur ta machine. Les récoltes que tu
            enregistres ne sont pas vérifiables : le site les confronte à ce que ta ferme peut produire et
            t&apos;avertit quand un chiffre dépasse le possible.
          </p>
        </Details>
      </div>

      <p className="mt-16 border-t border-trait pt-6 text-[13px] leading-relaxed text-poussiere">
        RustiCulture n&apos;est pas affilié à Facepunch Studios. Rust est une marque de Facepunch Studios Ltd.
      </p>
    </Page>
  );
}
