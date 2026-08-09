"use client";

import { calculerDerive, formatGenome, voisinsGrille } from "@/lib/crossbreed";
import type { Genome } from "@/data/game";
import { ChaineGenes } from "@/components/Genes";
import { Details } from "@/components/Ui";

/**
 * Ce que le plan risque de te coûter.
 *
 * Toutes les cases d'un bac se réécrivent mutuellement, donneuses comprises.
 * Une bonne graine placée à côté de déchets en ressort abîmée — c'est la
 * question qu'aucun autre outil ne pose, et le moteur savait déjà y répondre
 * sans que rien ne l'affiche.
 *
 * On raisonne par position et non par génome : la même graine placée dans un
 * coin ou sur un bord n'a pas les mêmes voisines, donc pas le même risque.
 */
export function DeriveDuPlan({ grille }: { grille: (Genome | null)[] }) {
  const risques = grille
    .map((genome, index) => {
      if (!genome || index === 4) return null;
      const voisins = voisinsGrille(index)
        .map((v) => grille[v])
        .filter((g): g is Genome => g !== null);
      if (voisins.length === 0) return null;
      return { index, genome, ...calculerDerive(genome, voisins) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (risques.length === 0) return null;

  const menacees = risques.filter((r) => r.probaPerte > 0.01);
  const pire = menacees.reduce<(typeof menacees)[number] | null>(
    (a, r) => (a === null || r.probaPerte > a.probaPerte ? r : a),
    null
  );

  return (
    <Details titre="Ce que ça risque de te coûter">
      {menacees.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-cendre">
          Aucune de tes donneuses ne se dégrade dans cette disposition. Tu récupères tes graines telles
          que tu les as mises.
        </p>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-cendre">
            Les plants se réécrivent mutuellement : tes donneuses subissent le croisement elles aussi.{" "}
            <span className="text-craie">
              {menacees.length} sur {risques.length}
            </span>{" "}
            risquent de ressortir moins bonnes qu&apos;elles ne sont entrées
            {pire && (
              <>
                , la plus exposée étant{" "}
                <span className="chiffre text-craie">{formatGenome(pire.genome)}</span> avec{" "}
                <span className="chiffre text-craie">{Math.round(pire.probaPerte * 100)} %</span> de
                chances de perdre du terrain
              </>
            )}
            .
          </p>

          <ul className="mt-4 grid gap-px overflow-hidden rounded-sm border border-trait bg-trait sm:grid-cols-2">
            {menacees
              .slice()
              .sort((a, b) => b.probaPerte - a.probaPerte)
              .map((r) => (
                <li key={r.index} className="flex items-center gap-3 bg-case px-3 py-2">
                  <ChaineGenes genome={r.genome} taille="sm" />
                  <span
                    className={`chiffre ml-auto text-[13px] ${
                      r.probaPerte > 0.5 ? "text-gene-w" : "text-mur"
                    }`}
                  >
                    −{Math.round(r.probaPerte * 100)} %
                  </span>
                </li>
              ))}
          </ul>

          <p className="mt-4 text-[13px] leading-relaxed text-poussiere">
            Ce n&apos;est pas une raison de renoncer au plan : c&apos;est une raison de garder une copie
            en caisse de chaque graine que tu y mets.
          </p>
        </>
      )}
    </Details>
  );
}
