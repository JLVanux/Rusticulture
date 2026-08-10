"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Details, EnTetePage, Note, Page } from "@/components/Ui";
import { useAdmin, useBases } from "@/lib/bases";
import { supabase } from "@/lib/supabase";

/**
 * Administration.
 *
 * L'accès est masqué quand on n'est pas administrateur, mais **ce n'est pas ce
 * qui protège** : les politiques de la base refusent toute écriture, et les
 * fonctions renvoient `null`. Cacher un bouton n'a jamais empêché personne
 * d'appeler l'API directement.
 */

interface Compte {
  id: string;
  pseudo: string;
  nom: string;
  inscrit_le: string;
  administrateur: boolean;
  fermes: number;
}

export default function PageAdmin() {
  const { admin, charge: adminCharge } = useAdmin();
  const { bases } = useBases(true);
  const [comptes, setComptes] = useState<Compte[]>([]);

  useEffect(() => {
    if (!admin) return;
    const sb = supabase();
    if (!sb) return;
    void sb.rpc("liste_comptes").then(({ data }) => setComptes((data as Compte[]) ?? []));
  }, [admin]);

  if (!adminCharge) {
    return (
      <Page>
        <p className="text-[15px] text-cendre">Chargement…</p>
      </Page>
    );
  }

  if (!admin) {
    return (
      <Page>
        <EnTetePage titre="Administration" />
        <Note ton="alerte">
          Cette page est réservée aux administrateurs. Si tu penses que c&apos;est une erreur,
          vérifie que tu es bien connecté avec le bon compte.
        </Note>
        <Link href="/" className="bouton mt-5 inline-flex">
          Retour à l&apos;accueil
        </Link>
      </Page>
    );
  }

  const enAttente = bases.filter((b) => !b.publiee);

  return (
    <Page large>
      <EnTetePage
        titre="Administration"
        intro="Valider les bases proposées et consulter les comptes."
      />

      <div className="verre mb-10 border-l-2 border-l-rouille p-4">
        <div className="eyebrow">Répertoire de bases</div>
        <p className="mt-1 text-[15px] leading-relaxed text-craie">
          {enAttente.length > 0
            ? `${enAttente.length} proposition${enAttente.length > 1 ? "s" : ""} en attente de relecture.`
            : "Rien en attente."}
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-cendre">
          La modération se fait directement sur la page du répertoire, là où tu vois les bases telles
          que les visiteurs les voient — pas dans un écran séparé.
        </p>
        <Link href="/bases" className="bouton bouton-primaire mt-3 inline-flex">
          Aller au répertoire
        </Link>
      </div>

      {/* Les comptes */}
      <section className="mt-12">
        <div className="filet mb-3">
          <h2 className="titre text-xl">Comptes</h2>
          <span className="chiffre shrink-0 text-[13px] text-cendre">{comptes.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-[14px]">
            <thead>
              <tr className="border-b border-trait">
                {["Pseudo", "Nom affiché", "Fermes", "Inscrit le"].map((t) => (
                  <th key={t} className="eyebrow pb-2">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => (
                <tr key={c.id} className="border-b border-trait/60">
                  <td className="py-2 font-mono text-craie">
                    @{c.pseudo}
                    {c.administrateur && <span className="ml-2 puce text-braise">admin</span>}
                  </td>
                  <td className="py-2 text-cendre">{c.nom}</td>
                  <td className="py-2 font-mono text-cendre">{c.fermes}</td>
                  <td className="py-2 font-mono text-[13px] text-poussiere">
                    {new Date(c.inscrit_le).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      <div className="mt-12">
        <Details titre="Ce que cette page ne fait pas">
          <p className="text-[14px] leading-relaxed text-cendre">
            Elle ne permet pas de supprimer un compte ni de lire les données d&apos;une ferme. Les
            politiques de la base l&apos;interdisent, y compris à un administrateur : le drapeau donne
            accès au répertoire et à la liste des comptes, rien de plus.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-cendre">
            Le drapeau lui-même se pose à la main dans la base — personne ne se nomme administrateur
            depuis le site.
          </p>
        </Details>
      </div>
    </Page>
  );
}
