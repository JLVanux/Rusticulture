"use client";

import Link from "next/link";
import { Details, EnTetePage, Note, Page } from "@/components/Ui";

export default function PageAide() {
  return (
    <Page large>
      <EnTetePage
        titre="Aide"
        intro="Comment brancher RustiCulture sur ton Discord, et réponses aux questions qui reviennent."
      />

      {/* ─────────── Discord ─────────── */}
      <section>
        <h2 className="titre text-2xl">Recevoir les alertes sur Discord</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-feuille-200">
          Ton équipe reçoit un message dans un salon quand un plant est prêt à être bouturé, et quand une
          récolte est prête. C&apos;est la seule façon d&apos;être prévenu sans garder un onglet ouvert :
          téléphone rangé, jeu en plein écran, le message arrive quand même.
        </p>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <Etape numero={1} titre="Crée un webhook dans ton salon Discord">
            <p>
              Sur ton serveur, fais un clic droit sur le salon où tu veux recevoir les messages →{" "}
              <span className="text-feuille-100">Modifier le salon</span> →{" "}
              <span className="text-feuille-100">Intégrations</span> →{" "}
              <span className="text-feuille-100">Créer un webhook</span>.
            </p>
            <p className="mt-2">
              Donne-lui le nom que tu veux, puis clique sur{" "}
              <span className="text-feuille-100">Copier l&apos;URL du webhook</span>.
            </p>
            <p className="mt-2 text-feuille-400">
              Il te faut la permission « Gérer les webhooks » sur le serveur. Si tu ne vois pas l&apos;onglet
              Intégrations, demande à l&apos;administrateur.
            </p>
          </Etape>

          <Etape numero={2} titre="Colle l'URL dans RustiCulture">
            <p>
              Va sur{" "}
              <Link href="/reglages" className="text-braise underline underline-offset-2">
                Réglages
              </Link>{" "}
              → section <span className="text-feuille-100">Notifications Discord</span>, colle l&apos;URL et
              enregistre. La pastille passe au vert.
            </p>
            <p className="mt-2 text-feuille-400">
              Réservé au propriétaire de la ferme. L&apos;URL ne sera plus jamais réaffichée, même à toi :
              c&apos;est un secret, elle ne redescend pas dans le navigateur.
            </p>
          </Etape>

          <Etape numero={3} titre="Lance un minuteur en plantant">
            <p>
              C&apos;est le minuteur qui déclenche les alertes. Sur{" "}
              <Link href="/minuteurs" className="text-lampe-chaud underline underline-offset-2">
                Minuteurs
              </Link>
              , renseigne les gènes plantés et surtout{" "}
              <span className="text-feuille-100">le nom du bac</span> — c&apos;est lui qui apparaîtra dans le
              message, et « Bac 3 » aide bien plus que « Chanvre GGGYYY ».
            </p>
          </Etape>
        </div>

        <div className="mt-6 panneau">
          <div className="eyebrow mb-2">Ce que tu recevras</div>
          <div className="space-y-3 font-mono text-[13px] leading-relaxed text-feuille-200">
            <p>
              🧬 <span className="font-bold">Bac 3 — va voir ton chanvre, le croisement est fait.</span>
              <br />
              Inspecte le plant en jeu pour découvrir ses nouveaux gènes. S&apos;ils te plaisent, bouture-le
              (hache en main) : la bouture les copie à l&apos;identique et tu les gardes pour de bon.
              <br />
              <span className="text-feuille-400">GGGYYY · planté par Vanux</span>
            </p>
            <p>
              🌾 <span className="font-bold">Salle du fond — ta baie bleue est prête à récolter.</span>
              <br />
              C&apos;est le rendement maximum. Passe la ramasser : ensuite le plant dépérit et tu perds les
              fruits.
              <br />
              <span className="text-feuille-400">GGYYYY · planté par Alex</span>
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Note>
            Deux messages seulement, et jamais plus. Pas de commentaire à chaque changement de stade : un salon
            noyé sous les alertes finit par être coupé, et plus personne ne voit celles qui comptent.
          </Note>
        </div>
      </section>

      {/* ─────────── Questions ─────────── */}
      <section className="mt-12">
        <h2 className="titre mb-3 text-2xl">Questions fréquentes</h2>

        <Details titre="Faut-il installer un bot sur mon serveur ?">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Non. Un webhook n&apos;est pas un bot : rien ne s&apos;installe, rien n&apos;est à autoriser, et
            RustiCulture n&apos;a aucun accès à ton serveur. C&apos;est toi qui crées une adresse d&apos;envoi
            dans ton salon et qui nous la confies. Elle ne permet que d&apos;écrire dans ce salon-là.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Un vrai bot viendra plus tard. Il apportera deux choses de plus : des commandes, et la possibilité
            de mentionner directement la personne concernée.
          </p>
        </Details>

        <Details titre="Chaque ferme a-t-elle son propre salon ?">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Oui. Chaque ferme enregistre son propre webhook, vers son propre serveur. Aucun mélange
            n&apos;est possible : l&apos;adresse contient déjà l&apos;identifiant du salon.
          </p>
        </Details>

        <Details titre="Je ne reçois rien">
          <ul className="space-y-2 text-[14px] leading-relaxed text-feuille-200">
            <li>
              <span className="text-feuille-100">Le minuteur est-il dans la ferme ?</span> En haut de la page
              Minuteurs, le bandeau doit dire « appartiennent à la ferme ». Un minuteur local ne déclenche
              rien.
            </li>
            <li>
              <span className="text-feuille-100">La pastille est-elle verte</span> sur la page Équipe ?
            </li>
            <li>
              <span className="text-feuille-100">Le seuil est-il passé ?</span> Les alertes partent au moment du
              croisement puis de la maturité, pas à la plantation.
            </li>
            <li>
              <span className="text-feuille-100">Le message a-t-il déjà été envoyé ?</span> Chacun ne part
              qu&apos;une fois. Relancer un minuteur déjà notifié ne renvoie rien : il faut en lancer un
              nouveau.
            </li>
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-feuille-400">
            Les alertes sont envoyées par vagues toutes les dix minutes : un message peut arriver avec un peu
            de retard sur l&apos;instant exact. Sans conséquence, la fenêtre de bouturage est large.
          </p>
        </Details>

        <Details titre="Comment couper les notifications ?">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Page Équipe → Notifications Discord → Retirer. Tu peux aussi supprimer le webhook côté Discord :
            le site s&apos;en aperçoit au premier échec et désactive l&apos;intégration tout seul.
          </p>
        </Details>

        <Details titre="Qui peut voir les données de ma ferme ?">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Uniquement les membres que tu as invités. Les permissions sont appliquées par la base de données
            elle-même, pas par l&apos;interface — masquer un bouton n&apos;empêcherait personne
            d&apos;interroger l&apos;API directement.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Le détail est sur la page{" "}
            <Link href="/confidentialite" className="text-lampe-chaud underline underline-offset-2">
              Confidentialité
            </Link>
            .
          </p>
        </Details>

        <Details titre="Puis-je utiliser le site sans compte ?">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Oui, et rien ne quitte alors ton navigateur. Le scanner, la génétique, les thés, le rendement et le
            coût de raid fonctionnent sans rien créer. Le compte ne sert qu&apos;à partager une ferme avec ton
            équipe.
          </p>
        </Details>
      </section>
    </Page>
  );
}

function Etape({
  numero,
  titre,
  children,
}: {
  numero: number;
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 verre rampe p-4">
      <span className="fente h-8 w-8 shrink-0 font-mono text-[15px] font-bold text-braise">
        {numero}
      </span>
      <div>
        <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-feuille-100">{titre}</h3>
        <div className="mt-1 text-[14px] leading-relaxed text-feuille-200">{children}</div>
      </div>
    </div>
  );
}
