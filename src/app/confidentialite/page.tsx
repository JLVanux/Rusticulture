"use client";

import Link from "next/link";
import { Details, EnTetePage, Page } from "@/components/Ui";

export default function PageConfidentialite() {
  return (
    <Page>
      <EnTetePage
        titre="Confidentialité"
        intro="Ce que le site conserve, pourquoi, et comment tout effacer."
      />

      <section className="space-y-5 text-[15px] leading-relaxed text-feuille-200">
        <p>
          RustiCulture est un outil gratuit et sans publicité pour les joueurs francophones de Rust. Il ne
          revend rien, ne suit personne à travers le web, et ne dépose aucun cookie publicitaire.
        </p>

        <div>
          <h2 className="titre mb-2 text-xl">Sans compte, rien ne sort de ton navigateur</h2>
          <p>
            Les calculateurs, le scanner et les outils de génétique fonctionnent entièrement sur ta machine.
            Tes graines, tes minuteurs et tes réglages sont enregistrés dans le stockage local de ton
            navigateur. Ils ne transitent par aucun serveur, et effacer les données du site les supprime
            définitivement.
          </p>
          <p className="mt-2">
            Le scanner d&apos;écran analyse l&apos;image sur ta machine. Aucune capture n&apos;est transmise.
          </p>
        </div>

        <div>
          <h2 className="titre mb-2 text-xl">Avec un compte</h2>
          <p>Créer un compte enregistre :</p>
          <ul className="mt-2 space-y-1.5 pl-5 text-feuille-200">
            <li className="list-disc">ton pseudo, et l&apos;identifiant technique qui en est dérivé ;</li>
            <li className="list-disc">une empreinte de ton mot de passe, jamais le mot de passe lui-même ;</li>
            <li className="list-disc">
              les données des fermes que tu crées ou rejoins : graines, plantations, minuteurs, récoltes,
              objectifs et journal d&apos;activité.
            </li>
          </ul>
          <p className="mt-3">
            Aucune adresse e-mail n&apos;est demandée et aucun message ne t&apos;est envoyé. Ces données sont
            visibles par les membres des fermes que tu partages, et par personne d&apos;autre.
          </p>
        </div>

        <div>
          <h2 className="titre mb-2 text-xl">Où et par qui</h2>
          <p>
            Le site est hébergé par Vercel, la base de données par Supabase, dans une région européenne. Deux
            outils de mesure de Vercel comptent les visites et les temps de chargement, sans cookie et sans
            identifier personne.
          </p>
        </div>

        <div>
          <h2 className="titre mb-2 text-xl">Effacer</h2>
          <p>
            Tu peux supprimer ton compte à tout moment depuis{" "}
            <Link href="/connexion" className="text-lampe-chaud underline underline-offset-2">
              Mon compte
            </Link>
            . La suppression est immédiate et définitive : rien n&apos;est conservé, pas d&apos;archive, pas de
            corbeille.
          </p>
          <p className="mt-2">
            Une ferme dont tu es propriétaire n&apos;est pas détruite si d&apos;autres membres y sont : elle est
            transmise au plus ancien d&apos;entre eux. Elle n&apos;est supprimée que si tu y es seul.
          </p>
        </div>
      </section>

      <div className="mt-10">
        <Details titre="Les données locales">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Ce qui est stocké dans ton navigateur ne peut être effacé que depuis ton navigateur. Les boutons
            « Tout supprimer » de la page Mes graines et de la page Réglages le font proprement ; vider les
            données de site depuis les préférences du navigateur fonctionne aussi.
          </p>
        </Details>

        <Details titre="Contact">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Pour toute question sur tes données, passe par le dépôt du projet sur GitHub.
          </p>
        </Details>
      </div>
    </Page>
  );
}
