"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { use } from "react";
import { EnTetePage, Page } from "@/components/Ui";
import { IconePlante } from "@/components/IconePlante";
import type { PlanteId } from "@/data/game";
import { supabase } from "@/lib/supabase";

/**
 * La page publique d'un joueur.
 *
 * Elle n'existe que si la personne l'a explicitement autorisée : la fonction en
 * base renvoie `null` sinon, sans distinguer « profil privé » de « pseudo
 * inexistant ». C'est volontaire — sinon la page devient un moyen de savoir qui
 * est inscrit.
 */
interface ProfilVu {
  pseudo: string;
  nom: string;
  bio: string | null;
  avatar: string | null;
  inscrit_le: string;
  wipes: number;
  fermes: number;
}

export default function PageProfil({ params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = use(params);
  const [profil, setProfil] = useState<ProfilVu | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setCharge(true);
      return;
    }
    void sb.rpc("profil_public_de", { p_pseudo: pseudo }).then(({ data }) => {
      setProfil((data as ProfilVu) ?? null);
      setCharge(true);
    });
  }, [pseudo]);

  if (!charge) {
    return (
      <Page>
        <p className="text-[15px] text-cendre">Chargement…</p>
      </Page>
    );
  }

  if (!profil) {
    return (
      <Page>
        <EnTetePage titre="Profil introuvable" />
        <p className="text-[15px] leading-relaxed text-cendre">
          Ce joueur n&apos;existe pas, ou n&apos;a pas rendu son profil public. Les profils sont privés
          par défaut.
        </p>
        <Link href="/" className="bouton mt-5 inline-flex">
          Retour à l&apos;accueil
        </Link>
      </Page>
    );
  }

  const inscrit = new Date(profil.inscrit_le);
  const jours = Math.max(1, Math.floor((Date.now() - inscrit.getTime()) / 86_400_000));

  return (
    <Page>
      <div className="flex flex-wrap items-center gap-5">
        <span className="fente h-20 w-20 shrink-0">
          {profil.avatar ? (
            <IconePlante plante={profil.avatar as PlanteId} taille={56} />
          ) : (
            <span className="chiffre text-3xl text-poussiere">
              {profil.pseudo.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <h1 className="titre text-3xl leading-tight">{profil.nom}</h1>
          <p className="font-mono text-[14px] text-poussiere">@{profil.pseudo}</p>
        </div>
      </div>

      {profil.bio && (
        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-cendre">{profil.bio}</p>
      )}

      <dl className="mt-8 grid gap-px overflow-hidden rounded-sm border border-trait bg-trait sm:grid-cols-3">
        <div className="bg-case p-4">
          <dt className="eyebrow">Wipes joués</dt>
          <dd className="chiffre mt-1 text-2xl">{profil.wipes}</dd>
        </div>
        <div className="bg-case p-4">
          <dt className="eyebrow">Fermes</dt>
          <dd className="chiffre mt-1 text-2xl">{profil.fermes}</dd>
        </div>
        <div className="bg-case p-4">
          <dt className="eyebrow">Inscrit depuis</dt>
          <dd className="chiffre mt-1 text-2xl">
            {jours < 60 ? `${jours} j` : `${Math.round(jours / 30)} mois`}
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-[13px] leading-relaxed text-poussiere">
        Rien d&apos;autre n&apos;est visible : ni les graines, ni les récoltes, ni les fermes elles-mêmes.
        Seuls les membres d&apos;une ferme voient ce qui s&apos;y passe.
      </p>

      <Link href="/" className="bouton mt-6 inline-flex">
        Découvrir RustiCulture
      </Link>
    </Page>
  );
}
