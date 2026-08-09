import Link from "next/link";
import { LegendeGenes } from "@/components/Genes";
import { ChaineCulture } from "@/components/IconePlante";
import { PLANTES } from "@/data/game";
import { Details, Page } from "@/components/Ui";

const OUTILS: { titre: string; texte: string; liens: { href: string; label: string }[] }[] = [
  {
    titre: "Génétique",
    texte:
      "Le cœur du site. Tu saisis tes graines, tu dis ce que tu veux obtenir, et l'assistant te donne la disposition exacte du bac — avec la justification case par case et tes chances réelles. Quand la cible est hors de portée, il calcule la route en plusieurs générations plutôt que de dire « impossible ».",
    liens: [
      { href: "/bac", label: "Gènes parfaits" },
      { href: "/scanner", label: "Scanner l'écran" },
      { href: "/genetique", label: "Mes graines" },
    ],
  },
  {
    titre: "Production",
    texte:
      "Combien de tissu par heure avec ces gènes-là. Combien de baies pour les thés que tu vises, et en combien de cycles. Ce que la tarte à l'ours ajoute vraiment à ton thé de minerai. Et la cadence de ton poulailler.",
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
      "Des minuteurs qui te disent quand revenir, et un calculateur de raid qui convertit tes cibles en soufre — donc en heures de minage.",
    liens: [
      { href: "/minuteurs", label: "Minuteurs" },
      { href: "/raid", label: "Coût de raid" },
    ],
  },
];

const FERME = [
  {
    titre: "Tout est partagé",
    texte:
      "Graines, minuteurs, bacs, récoltes : ce que fait un membre, toute l'équipe le voit. Trois rôles simples, appliqués par la base de données elle-même.",
  },
  {
    titre: "Alertes Discord",
    texte:
      "Un message dans votre salon quand un plant est prêt à bouturer ou à récolter. Jeu en plein écran, téléphone rangé : le message arrive quand même.",
  },
  {
    titre: "Estimé contre réel",
    texte:
      "Le site estime ce que ta ferme devrait produire, tu enregistres ce qu'elle produit vraiment, et l'écart te dit où tu perds du temps.",
  },
  {
    titre: "Un wipe à la fois",
    texte:
      "Objectifs, statistiques et progression sur toute la durée du wipe. À la fin, un résumé — puis tout repart à zéro sans rien effacer.",
  },
];

export default function Accueil() {
  return (
    <Page large>
      {/* Ce que fait le site, en une phrase */}
      <section className="pt-2">
        <div className="eyebrow">Agriculture · Rust · en français</div>
        <h1 className="titre mt-2 text-5xl leading-[0.95] sm:text-6xl">
          Les calculs de ta ferme,
          <br />
          <span className="text-lampe-chaud">faits pour toi.</span>
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-feuille-200">
          Croisement génétique, rendement, thés, minuteurs, coût de raid. Et un espace partagé pour gérer une
          ferme à plusieurs pendant tout un wipe.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/bac" className="bouton bouton-primaire">
            Obtenir les gènes parfaits
          </Link>
          <Link href="/ferme" className="bouton">
            Créer ma ferme
          </Link>
        </div>

        <p className="mt-4 text-[13px] text-feuille-400">
          Les calculateurs fonctionnent sans compte, entièrement dans ton navigateur.
        </p>
      </section>

      {/* La règle qui gouverne tout */}
      <section className="mt-14 lg:mt-16 rounded-lg border border-lampe/40 bg-lampe/8 p-6">
        <div className="eyebrow">La règle qui décide de tout</div>
        <h2 className="titre mt-1 text-3xl leading-tight">Deux verts battent un rouge.</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-feuille-200">
          Un G, un Y ou un H pèse <span className="font-mono text-feuille-100">0,6</span>. Un W ou un X pèse{" "}
          <span className="font-mono text-feuille-100">1,0</span>. Pour déloger un rouge il faut donc{" "}
          <span className="text-feuille-100">deux donneuses vertes identiques dans la même case</span> — 1,2
          contre 1,0. Une seule ne suffira jamais.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-feuille-400">
          C&apos;est là que la plupart des sessions de croisement échouent. Tout le reste du site n&apos;est
          que l&apos;application de cette règle.
        </p>
      </section>

      {/* Les trois états d'une culture */}
      <section className="mt-14">
        <div className="filet mb-3">
          <h2 className="titre text-2xl">Graine, buisson, récolte</h2>
        </div>
        <p className="max-w-2xl text-[15px] leading-relaxed text-cendre">
          Trois objets différents, trois noms différents. C&apos;est ce qui perd le plus de monde au début —
          d&apos;autant que les noms ne se déduisent pas : la baie bleue donne des myrtilles, le chanvre donne
          du tissu.
        </p>
        <div className="mt-5 grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {PLANTES.filter((p) => p.categorie !== "nourriture").map((p) => (
            <ChaineCulture key={p.id} plante={p.id} taille={36} />
          ))}
        </div>
      </section>

      {/* Les outils */}
      <section className="mt-14">
        <h2 className="titre text-2xl">Les outils</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {OUTILS.map((o) => (
            <article key={o.titre} className="panneau flex flex-col">
              <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-feuille-100">
                {o.titre}
              </h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-feuille-200">{o.texte}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {o.liens.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded border border-white/10 px-2.5 py-1.5 font-display text-[13px] font-semibold uppercase tracking-wide text-feuille-200 transition hover:border-lampe/60 hover:text-lampe-chaud"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* La ferme partagée */}
      <section className="mt-14">
        <h2 className="titre text-2xl">Jouer en équipe</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-feuille-200">
          Avec un compte, une ferme se partage entre coéquipiers. C&apos;est la partie qui transforme le site
          en outil qu&apos;on ouvre tous les jours plutôt qu&apos;en calculateur qu&apos;on consulte une fois.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FERME.map((f) => (
            <div key={f.titre} className="verre rampe p-4">
              <h3 className="font-display text-base font-semibold uppercase tracking-wide text-feuille-100">
                {f.titre}
              </h3>
              <p className="mt-1.5 text-[14px] leading-snug text-feuille-400">{f.texte}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/connexion" className="bouton bouton-primaire">
            Créer un compte
          </Link>
          <Link href="/aide" className="bouton">
            Brancher Discord
          </Link>
        </div>
        <p className="mt-3 text-[13px] text-feuille-400">
          Un pseudo et un mot de passe. Aucune adresse e-mail demandée, aucun message envoyé.
        </p>
      </section>

      {/* Le reste, replié */}
      <div className="mt-14">
        <Details titre="Les cinq gènes">
          <LegendeGenes />
        </Details>

        <Details titre="D'où viennent les chiffres">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Les règles de croisement viennent des mécaniques du jeu et sont solides : probabilités calculées
            exactement, case par case, pas simulées.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Les durées de pousse et les rendements sont un modèle approché — Facepunch ne publie pas ses
            formules, et les sources communautaires se contredisent du simple au double. Chronomètre un cycle
            en jeu et corrige les coefficients dans{" "}
            <Link href="/reglages" className="text-lampe-chaud underline underline-offset-2">
              Réglages
            </Link>
            : tout le site se recale dessus.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Une estimation n&apos;est jamais présentée comme une observation. Quand le site n&apos;est pas sûr,
            il le dit.
          </p>
        </Details>

        <Details titre="Ce que le site ne fait pas">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Il ne lit pas ta partie et ne se connecte à aucun serveur Rust. Tout ce qu&apos;il sait, c&apos;est
            ce que tu lui dis — ou ce que le scanner lit à l&apos;écran, sur ta machine. Les récoltes que tu
            enregistres ne sont pas vérifiables : le site les confronte à ce que ta ferme peut produire et
            t&apos;avertit quand un chiffre dépasse le possible.
          </p>
        </Details>
      </div>

      <p className="mt-14 border-t border-white/[0.07] pt-6 text-[13px] leading-relaxed text-feuille-400">
        RustiCulture n&apos;est pas affilié à Facepunch Studios. Rust est une marque de Facepunch Studios Ltd.
      </p>
    </Page>
  );
}
