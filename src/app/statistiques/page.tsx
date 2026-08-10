"use client";

import Link from "next/link";
import { Details, EnTetePage, Page } from "@/components/Ui";
import { VoirAussi } from "@/components/VoirAussi";
import { formatNombre } from "@/lib/model";
import { usePlantations, useProductionEstimee } from "@/lib/plantations";
import { useRecoltes, useStatistiques } from "@/lib/recoltes";
import { ilYA } from "@/lib/activites";
import { IconeRessource } from "@/components/IconePlante";
import { EvolutionRecoltes } from "@/components/Evolution";
import { SectionBadges } from "@/components/Badges";
import { useGraines } from "@/lib/graines";
import { useWipes } from "@/lib/wipes";

export default function PageStatistiques() {
  const { recoltes, wipe, disponible, connecte, modifiable, charge, supprimer } = useRecoltes();
  const { plantations } = usePlantations();
  const { toutes: graines } = useGraines();
  const { wipes } = useWipes();
  const production = useProductionEstimee(plantations);
  const stats = useStatistiques(recoltes, wipe ? new Date(wipe.debut).getTime() : null);

  if (!connecte || !disponible) {
    return (
      <Page large>
        <EnTetePage titre="Statistiques" />
        <div className="verre rampe p-6 text-center">
          <p className="text-[15px] text-feuille-200">
            Les statistiques suivent une ferme sur toute la durée d&apos;un wipe.
          </p>
          <Link href={connecte ? "/equipe" : "/connexion"} className="bouton bouton-primaire mt-4 inline-flex">
            {connecte ? "Créer une ferme" : "Se connecter"}
          </Link>
        </div>
      </Page>
    );
  }

  const jour = wipe
    ? Math.max(1, Math.floor((Date.now() - new Date(wipe.debut).getTime()) / 86_400_000) + 1)
    : null;

  return (
    <Page large>
      <EnTetePage
        titre="Statistiques"
        intro="Ce que ta ferme a réellement produit, comparé à ce qu'elle devrait produire."
      />

      <p className="mb-6 font-mono text-[13px] text-feuille-400">
        {wipe?.nom} · jour {jour} · {stats.nombreRecoltes} récolte
        {stats.nombreRecoltes > 1 ? "s" : ""} enregistrée{stats.nombreRecoltes > 1 ? "s" : ""}
      </p>

      {!charge ? (
        <p className="text-[15px] text-feuille-400">Chargement…</p>
      ) : stats.parRessource.length === 0 ? (
        <div className="rounded-verre border border-dashed border-white/15 p-10 text-center">
          <p className="text-feuille-200">Aucune récolte enregistrée.</p>
          <p className="mt-1 text-[13px] text-feuille-400">
            Enregistre-en une depuis le tableau de bord : c&apos;est ce qui donne un sens à tout le reste.
          </p>
          <Link href="/ferme" className="bouton mt-4 inline-flex">
            Aller au tableau de bord
          </Link>
        </div>
      ) : (
        <section className="grid gap-2 lg:grid-cols-2">
          {stats.parRessource.map((s) => (
            <article key={s.ressource} className="panneau">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="titre flex items-center gap-2 text-xl">
                  <IconeRessource ressource={s.ressource} taille={22} />
                  {s.ressource}
                </h2>
                <span className="font-display text-3xl font-bold text-lampe-chaud">
                  {formatNombre(s.total, 0)}
                </span>
              </div>

              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/[0.07] pt-3">
                <div>
                  <dt className="eyebrow">Récoltes</dt>
                  <dd className="font-mono text-lg text-feuille-100">{s.nombre}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Moyenne</dt>
                  <dd className="font-mono text-lg text-feuille-100">{formatNombre(s.moyenne, 0)}</dd>
                </div>
                <div>
                  <dt className="eyebrow">Meilleure</dt>
                  <dd className="font-mono text-lg text-feuille-100">{formatNombre(s.meilleure, 0)}</dd>
                </div>
                {s.efficacite !== null && (
                  <div>
                    <dt className="eyebrow">Rendement réel</dt>
                    <dd
                      className={`font-mono text-lg ${
                        s.efficacite >= 0.7
                          ? "text-gene-g"
                          : s.efficacite >= 0.4
                            ? "text-mur"
                            : "text-gene-w"
                      }`}
                    >
                      {Math.round(s.efficacite * 100)} %
                    </dd>
                  </div>
                )}
              </dl>

              {s.efficacite !== null && (
                <p className="mt-3 text-[13px] leading-relaxed text-feuille-400">
                  Ta ferme aurait pu produire environ {formatNombre(s.attendu, 0)} depuis le début du wipe si
                  elle avait tourné en continu.{" "}
                  {s.efficacite >= 0.7
                    ? "Tu en tires l'essentiel."
                    : s.efficacite >= 0.4
                      ? "Il reste de la marge : replanter plus vite après chaque récolte est le levier le plus simple."
                      : "Beaucoup de temps mort. Tes bacs passent l'essentiel du wipe à attendre ou à ne pas être replantés."}
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      <EvolutionRecoltes
        recoltes={recoltes}
        debutWipe={wipe ? new Date(wipe.debut).getTime() : null}
        ressources={stats.parRessource.map((s) => s.ressource)}
      />

      <SectionBadges
        recoltes={recoltes}
        graines={graines}
        plantations={plantations}
        nombreWipes={wipes.length}
      />

      {recoltes.length > 0 && (
        <section className="mt-10">
          <h2 className="titre mb-3 text-xl">Dernières récoltes</h2>
          <ul className="space-y-1">
            {recoltes.slice(0, 20).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-baseline gap-x-3 border-b border-white/[0.07] py-2 last:border-0"
              >
                <span className="font-mono text-[15px] font-bold text-feuille-100">
                  {formatNombre(r.quantite, 0)}
                </span>
                <span className="flex items-center gap-1.5 text-[14px] text-feuille-200">
                  <IconeRessource ressource={r.ressource} taille={16} />
                  {r.ressource}
                </span>
                {r.parQui && <span className="text-[13px] text-feuille-400">par {r.parQui}</span>}
                {r.note && <span className="text-[13px] italic text-feuille-400">{r.note}</span>}
                <span className="ml-auto font-mono text-[12px] text-feuille-400">{ilYA(new Date(r.recolteLe).toISOString())}</span>
                {modifiable && (
                  <button
                    type="button"
                    className="font-mono text-[11px] uppercase tracking-wider text-feuille-400 hover:text-gene-w"
                    onClick={() => {
                      if (confirm("Supprimer cette récolte des statistiques ?")) void supprimer(r.id);
                    }}
                  >
                    Supprimer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <Details titre="Comment lire le rendement réel">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            C&apos;est ce que tu as réellement enregistré, divisé par ce que ta ferme aurait produit en
            tournant sans interruption depuis le début du wipe. Personne n&apos;atteint 100 % : il faudrait
            replanter à la seconde près, jour et nuit.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            C&apos;est surtout une mesure de <span className="text-feuille-100">régularité</span>, pas de taille
            de ferme. Une petite ferme bien tenue peut afficher un meilleur rendement qu&apos;une grosse
            laissée à l&apos;abandon — et c&apos;est exactement ce qu&apos;un classement devrait récompenser.
          </p>
        </Details>

        <Details titre="Ce que ces chiffres ne savent pas">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Les récoltes sont saisies à la main : le site ne peut pas les vérifier. Il compare seulement
            chaque saisie à la capacité théorique de la ferme déclarée et t&apos;avertit quand un chiffre
            dépasse le possible.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Autre limite : la configuration de la ferme n&apos;est pas historisée. Si tu montes dix bacs
            aujourd&apos;hui, le site calcule ta production attendue des jours passés comme si tu les avais
            déjà — ton rendement réel apparaîtra donc plus bas qu&apos;il ne l&apos;était.
          </p>
        </Details>
      </div>
      <VoirAussi
        liens={[
          { href: "/ferme", label: "Ma ferme", detail: "Enregistrer une récolte et voir la production estimée." },
          { href: "/wipes", label: "Wipes", detail: "Le résumé des campagnes passées." },
        ]}
      />

    </Page>
  );
}
