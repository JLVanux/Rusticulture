"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlerteConditions } from "@/components/Conditions";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { IconePlante } from "@/components/IconePlante";
import { IconeRessource } from "@/components/IconePlante";
import { Champ, Choix, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { PLANTES, type Genome, type PlanteId } from "@/data/game";
import { decrireActivite, ilYA, useActivites } from "@/lib/activites";
import { useGraines } from "@/lib/graines";
import { formatDuree, formatNombre } from "@/lib/model";
import {
  CONTENANTS,
  CONTENANT_PAR_ID,
  usePlantations,
  useProductionEstimee,
  type Contenant,
} from "@/lib/plantations";
import { useTimers } from "@/lib/timers";
import { useRecoltes } from "@/lib/recoltes";
import { EnregistrerRecolte } from "@/components/EnregistrerRecolte";
import { SectionObjectifs } from "@/components/Objectifs";
import { SectionElevage } from "@/components/Elevage";
import { SectionParcours } from "@/components/Parcours";
import { useElevage, useProductionAvecOeufs } from "@/lib/elevage";
import { Recommandations } from "@/components/Recommandations";
import { useObjectifs } from "@/lib/objectifs";
import { calculerRecommandations } from "@/lib/recommandations";
import { useConditions, useConstantes } from "@/lib/hooks";

export default function PageTableauDeBord() {
  const {
    plantations,
    ferme,
    wipe,
    disponible,
    modifiable,
    connecte,
    charge,
    erreur,
    ajouter,
    supprimer,
    modifierQuantite,
  } = usePlantations();
  const productionPlantes = useProductionEstimee(plantations);
  const { elevage } = useElevage();
  const production = useProductionAvecOeufs(productionPlantes, elevage);
  const { timers } = useTimers();
  const { toutes: graines } = useGraines();
  const { activites } = useActivites(wipe?.id ?? null, 6);
  const { recoltes, enregistrer, modifiable: peutRecolter } = useRecoltes();
  const { objectifs } = useObjectifs();

  // Un membre qui ouvre sa ferme déclenche l'envoi des notifications en attente.
  const [conditions] = useConditions();
  const [constantes] = useConstantes();

  const recommandations = useMemo(
    () =>
      calculerRecommandations({
        plantations,
        graines,
        timers,
        recoltes,
        objectifs,
        production,
        conditions,
        constantes,
        debutWipe: wipe ? new Date(wipe.debut).getTime() : null,
        elevage,
      }),
    [plantations, graines, timers, recoltes, objectifs, production, conditions, constantes, wipe, elevage]
  );

  const [contenant, setContenant] = useState<Contenant>("grand_bac");
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const [genome, setGenome] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);
  const [quantite, setQuantite] = useState(1);

  const jour = wipe
    ? Math.max(1, Math.floor((Date.now() - new Date(wipe.debut).getTime()) / 86_400_000) + 1)
    : null;

  const totaux = useMemo(() => {
    const plants = plantations.reduce(
      (a, p) => a + (CONTENANT_PAR_ID[p.contenant]?.plants ?? 1) * p.quantite,
      0
    );
    const contenants = plantations.reduce((a, p) => a + p.quantite, 0);
    return { plants, contenants };
  }, [plantations]);

  if (!connecte || !disponible) {
    return (
      <Page>
        <EnTetePage titre="Ma ferme" />
        <div className="verre rampe p-6 text-center">
          <p className="text-[15px] text-feuille-200">
            {connecte
              ? "Crée ou rejoins une ferme pour suivre ta production."
              : "Connecte-toi pour suivre ta ferme et la partager avec ton équipe."}
          </p>
          <Link href={connecte ? "/equipe" : "/connexion"} className="bouton bouton-primaire mt-4 inline-flex">
            {connecte ? "Créer une ferme" : "Se connecter"}
          </Link>
          <p className="mt-3 text-[13px] text-feuille-400">
            Les calculateurs restent utilisables sans compte.
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page large>
      <EnTetePage titre={ferme?.nom ?? "Ma ferme"} />

      <div className="mb-6 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[13px] text-feuille-400">
        {wipe && (
          <span>
            {wipe.nom}
            {wipe.serveur && ` · ${wipe.serveur}`} · jour {jour}
          </span>
        )}
        <Link href="/wipes" className="text-lampe-chaud hover:underline">
          Wipes →
        </Link>
        <Link href="/equipe" className="text-lampe-chaud hover:underline">
          Équipe →
        </Link>
      </div>

      <AlerteConditions />

      {erreur && (
        <div className="mb-6">
          <Note ton="alerte">{erreur}</Note>
        </div>
      )}

      <div className="mb-8">
        <Recommandations recommandations={recommandations} />
      </div>

      <SectionParcours
        contexte={{
          graines,
          plantations,
          recoltes,
          timers,
          elevage,
          jour: jour ?? 1,
        }}
      />

      {/* Récolte réelle */}
      {peutRecolter && (
        <section className="mt-10 panneau">
          <h2 className="titre text-xl">Enregistrer une récolte</h2>
          <p className="mb-4 mt-1 text-[14px] leading-relaxed text-feuille-400">
            Ce que tu as réellement ramassé. C&apos;est la seule donnée observée du site —{" "}
            <Link href="/statistiques" className="text-lampe-chaud underline underline-offset-2">
              tes statistiques
            </Link>{" "}
            en découlent.
          </p>
          <EnregistrerRecolte
            recoltes={recoltes}
            production={production}
            debutWipe={wipe ? new Date(wipe.debut).getTime() : null}
            onEnregistrer={enregistrer}
          />
        </section>
      )}

      {/* Production estimée */}
      <section>
        <h2 className="titre text-2xl">Production estimée</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-feuille-400">
          Calculée à partir de ta configuration et du modèle du site.{" "}
          <span className="text-feuille-200">Ce n&apos;est pas une production constatée</span> — pour ça, il
          faudra enregistrer tes récoltes.
        </p>

        {production.length === 0 ? (
          <div className="mt-4 rounded-verre border border-dashed border-white/15 p-8 text-center">
            <p className="text-feuille-200">Aucune plantation déclarée.</p>
            <p className="mt-1 text-[13px] text-feuille-400">
              Renseigne tes bacs plus bas pour voir ta production.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {production.map((l) => (
              <li key={l.ressource} className="verre rampe p-4">
                <div className="flex items-center gap-2">
                  <IconeRessource ressource={l.ressource} taille={18} />
                  <span className="eyebrow">{l.ressource} / heure</span>
                </div>
                <div className="font-display text-3xl font-bold text-lampe-chaud">
                  {formatNombre(l.parHeure, 0)}
                </div>
                <div className="mt-2 border-t border-white/[0.07] pt-2 font-mono text-[12px] text-feuille-400">
                  {formatNombre(l.parCycle, 0)} par cycle de {formatDuree(l.minutesCycle)} · {l.plants} plants
                </div>
              </li>
            ))}
          </ul>
        )}

        {production.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[13px] text-feuille-400">
            <span>
              {totaux.contenants} contenant{totaux.contenants > 1 ? "s" : ""}
            </span>
            <span>{totaux.plants} plants</span>
            <span>
              {graines.reduce((a, g) => a + g.quantite, 0)} graines en réserve
            </span>
          </div>
        )}
      </section>

      <SectionObjectifs recoltes={recoltes} graines={graines} plantations={plantations} />

      {/* Configuration */}
      <section className="mt-10">
        <h2 className="titre text-2xl">Mes bacs</h2>

        {!charge ? (
          <p className="mt-3 text-[15px] text-feuille-400">Chargement…</p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {plantations.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <span className="font-display text-[15px] font-semibold uppercase tracking-wide text-feuille-100">
                  {CONTENANT_PAR_ID[p.contenant]?.nom}
                </span>
                <span className="text-[14px] text-feuille-200">
                  {PLANTES.find((x) => x.id === p.plante)?.nom}
                </span>
                {p.genome && <ChaineGenes genome={p.genome} taille="sm" />}
                <span className="font-mono text-[12px] text-feuille-400">
                  {(CONTENANT_PAR_ID[p.contenant]?.plants ?? 1) * p.quantite} plants
                </span>

                {modifiable ? (
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Retirer un contenant"
                      className="h-7 w-7 rounded border border-nuit-500 text-feuille-200 hover:border-lampe/50"
                      onClick={() => void modifierQuantite(p.id, p.quantite - 1)}
                      disabled={p.quantite <= 1}
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono text-sm text-feuille-100">×{p.quantite}</span>
                    <button
                      type="button"
                      aria-label="Ajouter un contenant"
                      className="h-7 w-7 rounded border border-nuit-500 text-feuille-200 hover:border-lampe/50"
                      onClick={() => void modifierQuantite(p.id, p.quantite + 1)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="ml-2 font-mono text-[11px] uppercase tracking-wider text-feuille-400 hover:text-gene-w"
                      onClick={() => void supprimer(p.id)}
                    >
                      Retirer
                    </button>
                  </div>
                ) : (
                  <span className="ml-auto font-mono text-[13px] text-feuille-400">×{p.quantite}</span>
                )}
              </li>
            ))}
            {plantations.length === 0 && (
              <li className="rounded border border-dashed border-white/10 p-6 text-center text-[14px] text-feuille-400">
                Rien de déclaré pour l&apos;instant.
              </li>
            )}
          </ul>
        )}

        {modifiable && (
          <div className="mt-4">
            <Details titre="Déclarer des bacs" ouvert={plantations.length === 0}>
              <div className="space-y-4">
                <Champ label="Contenant">
                  <Choix
                    valeur={contenant}
                    onChange={setContenant}
                    options={CONTENANTS.map((c) => ({ label: c.nom, valeur: c.id }))}
                  />
                </Champ>
                <p className="text-[13px] text-feuille-400">{CONTENANT_PAR_ID[contenant]?.note}</p>

                <Champ label="Plante">
                  <Choix
                    valeur={plante}
                    onChange={setPlante}
                    options={PLANTES.map((p) => ({
              label: p.nom,
              valeur: p.id,
              icone: <IconePlante plante={p.id} taille={16} />,
            }))}
                  />
                </Champ>

                <Champ label="Gènes plantés" aide="Laisse tel quel si tu ne sais pas : l'estimation sera basse.">
                  <EditeurGenes genome={genome} onChange={setGenome} taille="md" />
                </Champ>

                <div className="w-32">
                  <Champ label="Combien">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      className="champ"
                      value={quantite}
                      onChange={(e) => setQuantite(Math.max(1, Number(e.target.value)))}
                    />
                  </Champ>
                </div>

                <button
                  type="button"
                  className="bouton bouton-primaire"
                  onClick={() => {
                    void ajouter({ contenant, plante, genome, quantite, libelle: null });
                    setQuantite(1);
                  }}
                >
                  Ajouter
                </button>
              </div>
            </Details>
          </div>
        )}
      </section>

      <SectionElevage />

      {/* Journal */}
      {activites.length > 0 && (
        <section className="mt-10">
          <h2 className="titre text-xl">Activité récente</h2>
          <ul className="mt-3 space-y-1">
            {activites.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-white/[0.07] py-2 last:border-0"
              >
                <span className="text-[14px] text-feuille-200">{decrireActivite(a)}</span>
                <span className="font-mono text-[12px] text-feuille-400">{ilYA(a.cree_le)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <Details titre="Estimé, pas constaté">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Ces chiffres sortent du modèle du site appliqué à ce que tu as déclaré : ils supposent que tout
            pousse en conditions idéales et que tu replantes dès la récolte. La réalité sera plus basse.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Tant que tu n&apos;enregistres pas tes récoltes réelles, rien ici ne permet de savoir de combien.
            C&apos;est la prochaine étape, et c&apos;est elle qui donnera un sens aux statistiques.
          </p>
        </Details>

        <Details titre="Pourquoi le croisement ne concerne que le grand bac">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Le croisement dépend du nombre de voisines qu&apos;un plant touche. Seul le grand bac a la grille
            3×3 qui produit les probabilités calculées par le site. Les bacs triangulaires et les pots comptent
            ici, pour la production, mais pas dans les outils de génétique.
          </p>
        </Details>
      </div>
    </Page>
  );
}
