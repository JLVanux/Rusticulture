"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { Champ, Choix, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { PLANTES, type Genome, type PlanteId } from "@/data/game";
import { extraireDepuisTexte, scoreGenome } from "@/lib/crossbreed";
import { useGraines } from "@/lib/graines";
import { SourceGrainesBandeau } from "@/components/SourceGraines";

const GENOME_NEUF: Genome = ["G", "G", "G", "Y", "Y", "Y"];

export default function PageGenetique() {
  const {
    toutes: banque,
    source,
    modifiable,
    ferme,
    nbLocal,
    enAttente,
    charge,
    erreur,
    ajouterLot,
    ajuster,
    viderTout,
    transfererDepuisLocal,
  } = useGraines();
  const [brouillon, setBrouillon] = useState<Genome>(GENOME_NEUF);
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const [colle, setColle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<"toutes" | "propres">("toutes");

  const apercuImport = useMemo(() => extraireDepuisTexte(colle), [colle]);

  const visibles = useMemo(() => {
    const copie = banque.filter(
      (g) => filtre === "toutes" || !g.genome.some((l) => l === "W" || l === "X")
    );
    return copie.sort((a, b) => scoreGenome(b.genome) - scoreGenome(a.genome));
  }, [banque, filtre]);

  const total = banque.reduce((a, g) => a + g.quantite, 0);

  function importer() {
    const genomes = apercuImport;
    if (genomes.length === 0) {
      setMessage("Aucune suite de six lettres G, Y, H, W ou X trouvée dans ce texte.");
      return;
    }
    void ajouterLot(genomes, plante);
    setColle("");
    setMessage(`${genomes.length} graine${genomes.length > 1 ? "s" : ""} ajoutée${genomes.length > 1 ? "s" : ""}.`);
  }

  return (
    <Page>
      <EnTetePage
        titre="Banque de graines"
        intro="Saisis tes graines une fois. Le plan de bac et les calculs de rendement piochent dedans."
      />

      <SourceGrainesBandeau
        source={source}
        nomFerme={ferme?.nom}
        nbLocal={nbLocal}
        enAttente={enAttente}
        modifiable={modifiable}
        onTransferer={transfererDepuisLocal}
      />

      {/* Saisie principale */}
      <section className="rounded-lg border border-soil-600 bg-soil-850 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <Champ label="Gènes" aide="Clique une case pour changer la lettre.">
            <EditeurGenes genome={brouillon} onChange={setBrouillon} />
          </Champ>
          <button
            type="button"
            className="bouton bouton-primaire ml-auto"
            disabled={!modifiable}
            onClick={() => {
              void ajouterLot([brouillon], plante);
              setMessage(null);
            }}
          >
            Ajouter
          </button>
        </div>

        <div className="mt-5">
          <Champ label="Plante">
            <Choix
              valeur={plante}
              onChange={setPlante}
              options={PLANTES.map((p) => ({ label: p.nom, valeur: p.id }))}
            />
          </Champ>
        </div>
      </section>

      <p className="mt-4 text-[14px] text-moss-400">
        Plutôt que de tout taper,{" "}
        <Link href="/scanner" className="text-lamp-glow underline underline-offset-2">
          fais lire tes gènes directement à l&apos;écran
        </Link>
        .
      </p>

      {/* Liste */}
      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="titre text-2xl">
            {total} graine{total > 1 ? "s" : ""}
          </h2>
          <Choix
            valeur={filtre}
            onChange={setFiltre}
            options={[
              { label: "Toutes", valeur: "toutes" as const },
              { label: "Sans W ni X", valeur: "propres" as const },
            ]}
          />
        </div>

        <p className="mb-4 text-[13px] leading-relaxed text-moss-400">
          W et X sont les deux mauvais gènes : ils ne servent à rien et pèsent plus lourd que les bons dans
          un croisement. « Sans W ni X » n&apos;affiche que tes graines déjà propres.
        </p>

        {banque.length > 0 && (
          <div className="mb-4">
            <button
              type="button"
              className="bouton bouton-danger"
              disabled={!modifiable}
              onClick={() => {
                if (
                  confirm(
                    `Supprimer les ${total} graines de ta banque ?\n\nCette action est définitive et ne peut pas être annulée.`
                  )
                ) {
                  void viderTout();
                  setMessage("Banque vidée.");
                }
              }}
            >
              Tout supprimer
            </button>
          </div>
        )}

        {(erreur || message) && (
          <div className="mb-4">
            <Note ton={erreur ? "alerte" : "info"}>{erreur ?? message}</Note>
          </div>
        )}

        {!charge ? null : visibles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-soil-600 p-10 text-center">
            <p className="text-moss-200">
              {banque.length === 0 ? "Ta banque est vide." : "Aucune graine sans gène rouge."}
            </p>
            <p className="mt-1 text-[13px] text-moss-400">
              {banque.length === 0
                ? "Ramasse des graines sauvages et lis leurs gènes en jeu."
                : "C'est normal en début de wipe — c'est tout l'intérêt du croisement."}
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {visibles.map((g) => {
              const rouges = g.genome.filter((l) => l === "W" || l === "X").length;
              return (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded border border-soil-600 bg-soil-850 px-3 py-2.5"
                >
                  <ChaineGenes genome={g.genome} taille="sm" />
                  <span className="font-mono text-[12px] text-moss-400">
                    {PLANTES.find((p) => p.id === g.plante)?.nom}
                  </span>
                  {rouges === 0 && <span className="puce border-gene-g/40 text-gene-g">propre</span>}

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Retirer une graine"
                      className="h-7 w-7 rounded border border-soil-500 text-moss-200 hover:border-lamp/50"
                      onClick={() => void ajuster(g.id, -1)}
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono text-sm text-moss-100">{g.quantite}</span>
                    <button
                      type="button"
                      aria-label="Ajouter une graine"
                      className="h-7 w-7 rounded border border-soil-500 text-moss-200 hover:border-lamp/50"
                      onClick={() => void ajuster(g.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-10">
        <Details titre="Coller une liste">
          <textarea
            className="champ h-28 font-mono"
            placeholder="XWYGYH GHYWXG GGYYXW"
            value={colle}
            onChange={(e) => {
              setColle(e.target.value);
              setMessage(null);
            }}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="bouton bouton-primaire"
              onClick={importer}
              disabled={apercuImport.length === 0}
            >
              Importer {apercuImport.length > 0 && `${apercuImport.length} graine${apercuImport.length > 1 ? "s" : ""}`}
            </button>
            {colle.trim() && apercuImport.length === 0 && (
              <span className="text-[13px] text-ripe">
                Rien de reconnaissable — il faut des suites de six lettres parmi G, Y, H, W, X.
              </span>
            )}
          </div>

          {apercuImport.length > 0 && (
            <div className="mt-4">
              <div className="eyebrow mb-2">Ce qui sera ajouté</div>
              <div className="flex flex-wrap gap-1.5">
                {apercuImport.slice(0, 30).map((g, i) => (
                  <ChaineGenes key={i} genome={g} taille="sm" />
                ))}
                {apercuImport.length > 30 && (
                  <span className="self-center font-mono text-[12px] text-moss-400">
                    +{apercuImport.length - 30}
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="mt-4 text-[13px] leading-relaxed text-moss-400">
            Les séparateurs n&apos;ont pas d&apos;importance : espaces, virgules, barres obliques, retours à la
            ligne, ou même du texte autour. Tout ce qui ressemble à six lettres de gène est récupéré.
          </p>
        </Details>

        <Details titre="Garder des copies de secours">
          <p className="text-[14px] leading-relaxed text-moss-200">
            Avant de te servir d&apos;une graine comme donneuse, fais-en pousser une et prends-en deux ou trois
            boutures. Un croisement raté n&apos;est pas grave. Se retrouver sans donneur de secours, si — tu
            repars de zéro.
          </p>
        </Details>
      </div>
    </Page>
  );
}
