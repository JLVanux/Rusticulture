"use client";

import Link from "next/link";
import { Details, EnTetePage, Note, Page } from "@/components/Ui";

export default function PageAideDiscord() {
  return (
    <Page>
      <EnTetePage
        titre="Notifications Discord"
        intro="Recevoir dans ton salon un message quand un plant est prêt. Trois minutes, rien à installer."
      />

      <Note>
        Ça résout la limite la plus agaçante du site : les alertes du navigateur exigent un onglet ouvert.
        Là, tu peux tout fermer — le message arrive quand même, sur ton téléphone comme sur ton PC.
      </Note>

      <section className="mt-8">
        <h2 className="titre text-xl">Ce que tu recevras</h2>
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-white/10 bg-nuit-900 p-4 font-mono text-[13px] leading-relaxed text-feuille-200">
            🧬 <span className="font-bold text-feuille-100">Bac du fond — le croisement est fait.</span>
            <br />
            Va inspecter ce plant de chanvre GGGYYY en jeu pour découvrir ses nouveaux gènes. S&apos;ils te
            plaisent, bouture-le (hache en main) : la bouture les copie à l&apos;identique.
            <br />
            <span className="text-feuille-400">planté par Vanux</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-nuit-900 p-4 font-mono text-[13px] leading-relaxed text-feuille-200">
            🌾 <span className="font-bold text-feuille-100">Serre 2 · bac 3 — prête à récolter.</span>
            <br />
            Ce plant de citrouille GGYYYY est au rendement maximum. Passe le ramasser : ensuite il dépérit et
            tu perds les fruits.
            <br />
            <span className="text-feuille-400">planté par Alex</span>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-feuille-400">
          Deux messages, pas un de plus. Pas de changement de stade intermédiaire, pas d&apos;annonce à chaque
          graine ajoutée. Un salon noyé sous les notifications finit par être coupé.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="titre text-xl">Comment l&apos;installer</h2>
        <p className="mt-1 text-[14px] text-feuille-400">
          Réservé au propriétaire de la ferme. Il n&apos;y a aucune application à autoriser sur ton serveur.
        </p>

        <ol className="mt-4 space-y-3">
          {[
            {
              titre: "Crée le webhook dans Discord",
              texte:
                "Clic droit sur le salon où tu veux recevoir les messages → Modifier le salon → Intégrations → Créer un webhook. Donne-lui un nom si tu veux, puis clique « Copier l'URL du webhook ».",
            },
            {
              titre: "Colle l'adresse dans RustiCulture",
              texte:
                "Page Équipe → section Notifications Discord → colle l'URL → Enregistrer. La pastille passe au vert.",
            },
            {
              titre: "Nomme tes bacs en lançant tes minuteurs",
              texte:
                "Le champ « Quel bac ? » est ce que ton équipe lira. « Bac du fond » est bien plus utile que le nom par défaut, surtout à quinze bacs.",
            },
          ].map((e, i) => (
            <li key={e.titre} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <span className="font-mono text-lg font-bold text-lampe/70">{i + 1}</span>
              <div>
                <h3 className="font-display text-base font-semibold uppercase tracking-wide text-feuille-100">
                  {e.titre}
                </h3>
                <p className="mt-1 text-[14px] leading-snug text-feuille-200">{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link href="/equipe" className="bouton bouton-primaire mt-5 inline-flex">
          Aller configurer
        </Link>
      </section>

      <div className="mt-10">
        <Details titre="Qui reçoit les messages">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Tout le monde dans le salon choisi. Le webhook appartient à ta ferme et n&apos;écrit que dans ce
            salon-là : deux fermes différentes ne peuvent pas se retrouver mélangées.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Les minuteurs lancés sans compte, en local, ne déclenchent rien : ils n&apos;existent que dans ton
            navigateur.
          </p>
        </Details>

        <Details titre="Pourquoi il n'y a rien à installer">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Un webhook n&apos;est pas un bot. C&apos;est une adresse que <em>tu</em> fabriques dans ton salon et
            que tu confies à RustiCulture pour qu&apos;il puisse y écrire. Rien n&apos;est ajouté à ton serveur,
            aucune permission n&apos;est accordée, et tu peux le supprimer côté Discord à tout moment.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Cette adresse est un secret : qui la possède peut écrire dans ton salon. Elle n&apos;est donc jamais
            réaffichée, même à toi. Si elle a circulé plus loin que prévu, supprime le webhook dans Discord et
            recommence.
          </p>
        </Details>

        <Details titre="Le message n'arrive pas">
          <ul className="space-y-2 text-[14px] leading-relaxed text-feuille-200">
            <li>
              <span className="text-feuille-100">La pastille est-elle verte</span> sur la page Équipe ? Sinon
              l&apos;adresse n&apos;a pas été acceptée.
            </li>
            <li>
              <span className="text-feuille-100">Le minuteur appartient-il à la ferme</span> ? Le bandeau en haut
              de la page Minuteurs doit le dire. Un minuteur local ne déclenche rien.
            </li>
            <li>
              <span className="text-feuille-100">Le seuil est-il vraiment franchi</span> ? Le message part au
              stade Croisement, pas à la plantation.
            </li>
            <li>
              <span className="text-feuille-100">Un peu de patience</span> : la vérification tourne toutes les dix
              minutes, le message peut arriver avec quelques minutes de décalage.
            </li>
            <li>
              <span className="text-feuille-100">Webhook supprimé côté Discord</span> ? L&apos;intégration se
              désactive toute seule pour ne pas insister. Il faut en recoller une nouvelle.
            </li>
          </ul>
        </Details>

        <Details titre="Et un vrai bot, avec des mentions ?">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            C&apos;est envisagé. Un bot permettrait de taguer directement la personne concernée et d&apos;ajouter
            des commandes. Mais il faudrait relier chaque compte RustiCulture à un compte Discord, et une
            application à autoriser sur ton serveur. Le webhook fait déjà l&apos;essentiel sans rien de tout ça.
          </p>
        </Details>
      </div>
    </Page>
  );
}
