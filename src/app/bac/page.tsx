"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { ExplicationCases } from "@/components/Explication";
import { Details, EnTetePage, Note, Page } from "@/components/Ui";
import { GENOMES_CIBLES, PLANTES, type Genome, type PlanteId } from "@/data/game";
import {
  analyserBac,
  expliquerPlant,
  extraireDepuisTexte,
  formatGenome,
  optimiserBac,
  optimiserDeuxTemps,
  optimiserProgres,
  parseGenome,
  scoreGenome,
  type EntreeBanque,
  type Plan,
} from "@/lib/crossbreed";
import { useBanque, type Graine } from "@/lib/hooks";
import { idUnique } from "@/lib/storage";

const AUTOUR = [0, 1, 2, 3, 5, 6, 7, 8];

export default function PageGenesParfaits() {
  const [banque, setBanque] = useBanque();
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const [cible, setCible] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);
  const [colle, setColle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [route, setRoute] = useState<"une" | "deux">("deux");

  const graines = useMemo(
    () => banque.filter((g) => g.plante === plante && g.quantite > 0),
    [banque, plante]
  );
  const nbGraines = graines.reduce((a, g) => a + g.quantite, 0);

  const entrees: EntreeBanque[] = useMemo(
    () => graines.map((g) => ({ id: g.id, genome: g.genome, quantite: g.quantite })),
    [graines]
  );

  const direct = useMemo(() => (entrees.length > 0 ? optimiserBac(entrees, cible) : null), [entrees, cible]);
  const deuxTemps = useMemo(
    () => (entrees.length > 0 ? optimiserDeuxTemps(entrees, cible) : null),
    [entrees, cible]
  );
  // Dernier recours : même si la deuxième étape n'aboutit pas encore, un pont
  // qui rapproche de la cible vaut mieux que « impossible ».
  const pont = useMemo(
    () => (entrees.length > 0 ? optimiserProgres(entrees, cible) : null),
    [entrees, cible]
  );

  const pDirect = direct?.probabilite ?? 0;
  const pDeux = deuxTemps?.probaGlobale ?? 0;

  // Deux temps vaut le coup dès qu'il est plus sûr, ou dès que le coup unique
  // n'est pas garanti.
  const deuxRecommande = !!deuxTemps && pDeux > pDirect + 0.001;
  const routeActive = deuxRecommande && route === "deux" ? "deux" : "une";

  const apercuImport = useMemo(() => extraireDepuisTexte(colle), [colle]);

  function importer() {
    if (apercuImport.length === 0) return;
    setBanque((prec) => {
      const suivant = [...prec];
      for (const genome of apercuImport) {
        const code = formatGenome(genome);
        const i = suivant.findIndex((g) => formatGenome(g.genome) === code && g.plante === plante);
        if (i >= 0) suivant[i] = { ...suivant[i], quantite: suivant[i].quantite + 1 };
        else {
          const graine: Graine = { id: idUnique(), genome, quantite: 1, plante };
          suivant.push(graine);
        }
      }
      return suivant;
    });
    setMessage(`${apercuImport.length} graine${apercuImport.length > 1 ? "s" : ""} ajoutée${apercuImport.length > 1 ? "s" : ""}.`);
    setColle("");
  }

  function toutSupprimer() {
    const n = graines.reduce((a, g) => a + g.quantite, 0);
    const nom = PLANTES.find((p) => p.id === plante)?.nom.toLowerCase();
    if (!confirm(`Supprimer les ${n} graines de ${nom} ? Cette action est définitive.`)) return;
    setBanque((prec) => prec.filter((g) => g.plante !== plante));
    setMessage("Graines supprimées.");
  }

  return (
    <Page>
      <EnTetePage
        titre="Obtenir les gènes parfaits"
        intro="Tu dis ce que tu as, tu dis ce que tu veux, le site te donne la disposition exacte et t'explique chaque case."
      />

      {/* ─────────── ÉTAPE 1 ─────────── */}
      <Etape numero={1} titre="Tes graines" resume={nbGraines > 0 ? `${nbGraines} en stock` : undefined}>
        <div className="mb-4">
          <div className="eyebrow mb-1.5">Plante</div>
          <select
            className="champ max-w-xs"
            value={plante}
            onChange={(e) => setPlante(e.target.value as PlanteId)}
          >
            {PLANTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </div>

        {nbGraines === 0 ? (
          <>
            <p className="mb-3 text-[14px] leading-relaxed text-moss-200">
              Colle les gènes de tes graines, tels que tu les lis en jeu. Séparateurs libres. Tu peux aussi{" "}
              <Link href="/scanner" className="text-lamp-glow underline underline-offset-2">
                les faire lire à l&apos;écran
              </Link>
              .
            </p>
            <textarea
              className="champ h-24 font-mono"
              placeholder="GGGYYW GGXYYY WGGYYY GXGYYY GGGWYY"
              value={colle}
              onChange={(e) => setColle(e.target.value)}
            />
            <button
              type="button"
              className="bouton bouton-primaire mt-3"
              onClick={importer}
              disabled={apercuImport.length === 0}
            >
              Ajouter {apercuImport.length > 0 && `${apercuImport.length} graine${apercuImport.length > 1 ? "s" : ""}`}
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {graines
                .slice()
                .sort((a, b) => scoreGenome(b.genome) - scoreGenome(a.genome))
                .map((g) => (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-2 rounded border border-soil-600 bg-soil-900 px-2 py-1"
                  >
                    <ChaineGenes genome={g.genome} taille="sm" />
                    <span className="font-mono text-[11px] text-moss-400">×{g.quantite}</span>
                  </span>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <details className="w-full">
                <summary className="cursor-pointer font-mono text-[12px] uppercase tracking-wider text-moss-400 hover:text-moss-200">
                  En ajouter d&apos;autres
                </summary>
                <textarea
                  className="champ mt-3 h-20 font-mono"
                  value={colle}
                  onChange={(e) => setColle(e.target.value)}
                />
                <button
                  type="button"
                  className="bouton mt-2"
                  onClick={importer}
                  disabled={apercuImport.length === 0}
                >
                  Ajouter {apercuImport.length > 0 && apercuImport.length}
                </button>
              </details>

              <button type="button" className="bouton bouton-danger" onClick={toutSupprimer}>
                Tout supprimer
              </button>
              <Link href="/genetique" className="font-mono text-[12px] text-moss-400 hover:text-lamp-glow">
                Gérer mes graines →
              </Link>
            </div>
          </>
        )}

        {message && <p className="mt-3 font-mono text-[12px] text-gene-g">{message}</p>}
      </Etape>

      {/* ─────────── ÉTAPE 2 ─────────── */}
      <Etape numero={2} titre="Ce que tu veux obtenir" resume={formatGenome(cible)}>
        <div className="space-y-1.5">
          {GENOMES_CIBLES.map((c) => {
            const g = parseGenome(c.code);
            const actif = c.code === formatGenome(cible);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => g && setCible(g)}
                className={`flex w-full flex-wrap items-center gap-3 rounded border px-3 py-2.5 text-left transition ${
                  actif ? "border-lamp bg-lamp/10" : "border-soil-600 bg-soil-850 hover:border-soil-500"
                }`}
              >
                {g && <ChaineGenes genome={g} taille="sm" />}
                <span
                  className={`font-display text-[15px] font-semibold uppercase tracking-wide ${
                    actif ? "text-lamp-glow" : "text-moss-100"
                  }`}
                >
                  {c.libelle}
                </span>
                <span className="w-full text-[13px] leading-snug text-moss-400 sm:w-auto sm:flex-1">
                  {c.pour}
                </span>
              </button>
            );
          })}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer font-mono text-[12px] uppercase tracking-wider text-moss-400 hover:text-moss-200">
            Composer des gènes sur mesure
          </summary>
          <div className="mt-3">
            <EditeurGenes genome={cible} onChange={setCible} taille="md" />
          </div>
        </details>
      </Etape>

      {/* ─────────── ÉTAPE 3 ─────────── */}
      <Etape numero={3} titre="Ton plan" dernier>
        {nbGraines === 0 ? (
          <p className="text-[15px] text-moss-400">Commence par ajouter tes graines à l&apos;étape 1.</p>
        ) : (
          <>
            {/* Le choix de route, mis en balance */}
            <div className="grid gap-3 sm:grid-cols-2">
              <CarteRoute
                titre="En une fois"
                sousTitre="Le coup direct"
                proba={pDirect}
                cycles={1}
                choisie={routeActive === "une"}
                recommandee={!deuxRecommande && pDirect > 0}
                onClick={() => setRoute("une")}
                argument={
                  pDirect >= 0.999
                    ? "Rien à jouer, ça passe à coup sûr."
                    : pDirect > 0
                      ? `Tu joues tout sur un croisement. En moyenne, ${Math.ceil(1 / pDirect)} tentatives.`
                      : "Tes graines ne suffisent pas pour y aller directement."
                }
              />
              <CarteRoute
                titre="En deux fois"
                sousTitre="Fabrique un pont, puis vise"
                proba={pDeux}
                cycles={2}
                choisie={routeActive === "deux"}
                recommandee={deuxRecommande}
                onClick={() => deuxTemps && setRoute("deux")}
                desactivee={!deuxTemps}
                argument={
                  deuxTemps
                    ? `Un cycle de plus, mais chaque étape est prise séparément : ${(deuxTemps.etape1.probabilite * 100).toFixed(0)} % puis ${(deuxTemps.etape2.probabilite * 100).toFixed(0)} %.`
                    : "Aucun intermédiaire utile trouvé avec ces graines."
                }
              />
            </div>

            {deuxRecommande && (
              <div className="mt-4">
                <Note>
                  <span className="text-moss-100">Pourquoi deux fois est plus sûr.</span> Viser les gènes
                  parfaits d&apos;un coup demande souvent de corriger trois ou quatre cases en même temps, et
                  il suffit qu&apos;une seule tombe mal pour tout perdre. En passant par un intermédiaire, tu
                  corriges la moitié des cases, tu <span className="text-moss-100">clones</span> le résultat —
                  il est alors acquis pour de bon — et tu repars de cette base propre. Tu ne peux plus
                  redescendre.
                </Note>
              </div>
            )}

            {routeActive === "deux" && deuxTemps ? (
              <div className="mt-8 space-y-8">
                <BlocEtape
                  numero={1}
                  sur={2}
                  titre="Fabrique le pont"
                  plan={{
                    centre: deuxTemps.etape1.centre.genome,
                    donneurs: deuxTemps.etape1.donneurs.map((d) => d.genome),
                  }}
                  resultat={deuxTemps.etape1.genomeProbable}
                  proba={deuxTemps.etape1.probabilite}
                  cible={deuxTemps.etape1.genomeProbable}
                  apres={
                    <p className="mt-4 rounded border-l-2 border-lamp py-2 pl-3 text-[14px] leading-relaxed text-moss-200">
                      <span className="text-moss-100">L&apos;étape à ne pas rater :</span> dès que ce plant
                      passe en stade Croisement, prends-en{" "}
                      <span className="text-moss-100">{deuxTemps.bouturesSupposees} boutures</span>. Elles
                      copient les gènes à l&apos;identique — c&apos;est ce qui rend l&apos;étape 2 fiable.
                      Sans ça, tu n&apos;as qu&apos;un seul exemplaire et tout repose encore sur la chance.
                    </p>
                  }
                />

                <BlocEtape
                  numero={2}
                  sur={2}
                  titre="Vise les gènes parfaits"
                  plan={{
                    centre: deuxTemps.etape2.centre.genome,
                    donneurs: deuxTemps.etape2.donneurs.map((d) => d.genome),
                  }}
                  resultat={cible}
                  proba={deuxTemps.etape2.probabilite}
                  cible={cible}
                  explications={expliquerPlant(
                    deuxTemps.etape2.centre.genome,
                    deuxTemps.etape2.donneurs.map((d) => d.genome),
                    cible
                  )}
                  note={`Ce plan suppose que tu as bien ${deuxTemps.bouturesSupposees} boutures du pont.`}
                />

                <div className="rounded-lg border border-lamp/40 bg-lamp/8 p-5">
                  <div className="eyebrow">Bout en bout</div>
                  <div className="font-display text-3xl font-bold text-lamp-glow">
                    {(pDeux * 100).toFixed(0)} %
                  </div>
                  <p className="mt-1 text-[14px] text-moss-200">
                    de chances de réussir les deux étapes d&apos;affilée, contre{" "}
                    {(pDirect * 100).toFixed(0)} % en une seule.
                  </p>
                </div>
              </div>
            ) : direct && pDirect > 0 ? (
              <div className="mt-8">
                <BlocEtape
                  titre="La disposition"
                  plan={{
                    centre: direct.centre.genome,
                    donneurs: direct.donneurs.map((d) => d.genome),
                  }}
                  resultat={cible}
                  proba={pDirect}
                  cible={cible}
                  explications={expliquerPlant(
                    direct.centre.genome,
                    direct.donneurs.map((d) => d.genome),
                    cible
                  )}
                />
                <AlerteDonneuses plan={direct} cible={cible} />
              </div>
            ) : (
              <div className="mt-8">
                {pont && pont.casesApres > pont.casesAvant + 0.05 && pont.probabilite > 0 ? (
                  <>
                    <Note>
                      <span className="text-moss-100">Il faudra plus de deux cycles.</span> Tes graines sont
                      trop abîmées pour viser {formatGenome(cible)} directement, mais tu peux déjà progresser.
                      Fabrique le pont ci-dessous, prends-en des boutures, ajoute-les à tes graines, et
                      reviens : le plan se recalculera avec cette nouvelle base.
                    </Note>
                    <div className="mt-6">
                      <BlocEtape
                        numero={1}
                        sur={0}
                        titre="Fabrique un premier pont"
                        plan={{
                          centre: pont.centre.genome,
                          donneurs: pont.donneurs.map((d) => d.genome),
                        }}
                        resultat={pont.genomeProbable}
                        proba={pont.probabilite}
                        cible={cible}
                        note={`Tu passes de ${pont.casesAvant} case${pont.casesAvant > 1 ? "s" : ""} juste${pont.casesAvant > 1 ? "s" : ""} à ${pont.casesApres.toFixed(1)} sur 6.`}
                      />
                    </div>
                  </>
                ) : (
                  <Note ton="alerte">
                    Tes graines ne permettent pas d&apos;atteindre {formatGenome(cible)}, et aucun
                    intermédiaire utile n&apos;a été trouvé. Ramasse d&apos;autres graines sauvages, ou vise
                    une combinaison moins exigeante à l&apos;étape 2.
                  </Note>
                )}
              </div>
            )}

            <MarcheASuivre deuxTemps={routeActive === "deux" && !!deuxTemps} />
          </>
        )}
      </Etape>

      <div className="mt-12">
        <Details titre="La règle du croisement, en entier">
          <div className="space-y-3 text-[14px] leading-relaxed text-moss-200">
            <p>
              Chaque graine porte six cases de gène. Quand un plant entre en stade Croisement, chacune de ses
              six cases est rejouée <span className="text-moss-100">séparément</span> — ce qui se passe dans la
              case 1 n&apos;influence pas la case 2.
            </p>
            <p>
              Pour une case donnée, toutes les plantes qui touchent le plant votent, diagonales comprises.
              Chaque voisine apporte le poids de son propre gène dans cette case : G, Y et H pèsent 0,6 ; W et
              X pèsent 1,0. On additionne par type de gène.
            </p>
            <p>
              Le gène qui totalise le plus l&apos;emporte —{" "}
              <span className="text-moss-100">à condition de dépasser strictement</span> le poids du gène déjà
              en place. À égalité, le plant garde le sien : il défend sa position.
            </p>
            <p>
              D&apos;où la règle qui gouverne tout :{" "}
              <span className="text-moss-100">il faut deux donneuses vertes pour déloger un rouge</span> (1,2
              contre 1,0). Une seule ne suffira jamais, quel que soit le nombre de cycles.
            </p>
            <p>
              Deux gènes différents peuvent aussi se retrouver à égalité entre eux — deux G contre deux Y font
              1,2 partout. Le jeu tire alors à pile ou face, et c&apos;est de là que viennent les pourcentages
              en dessous de 100 %.
            </p>
          </div>
        </Details>

        <Details titre="Graine, bouture, et pourquoi il faut des copies">
          <div className="space-y-3 text-[14px] leading-relaxed text-moss-200">
            <p>
              Une <span className="text-moss-100">graine</span> plantée se croise avec ses voisines : c&apos;est
              par elle que tu fais évoluer des gènes.
            </p>
            <p>
              Une <span className="text-moss-100">bouture</span> copie les six gènes du parent sans aucun
              tirage. C&apos;est comme ça qu&apos;on fige un résultat une fois qu&apos;il est bon. Attention
              quand même : replantée à côté de graines différentes, elle se fait recroiser comme n&apos;importe
              quel plant. Garde tes bonnes boutures entre elles, ou seules.
            </p>
            <p>
              Conséquence pratique : n&apos;utilise jamais ta dernière copie comme donneuse. Fais-la pousser,
              prends deux ou trois boutures, range-les, et travaille avec le reste. Un croisement raté
              n&apos;est pas grave ; se retrouver sans donneuse de secours, si.
            </p>
          </div>
        </Details>
      </div>
    </Page>
  );
}

// -----------------------------------------------------------------------------

function CarteRoute({
  titre,
  sousTitre,
  proba,
  cycles,
  argument,
  choisie,
  recommandee,
  desactivee,
  onClick,
}: {
  titre: string;
  sousTitre: string;
  proba: number;
  cycles: number;
  argument: string;
  choisie: boolean;
  recommandee?: boolean;
  desactivee?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactivee}
      className={`rounded-lg border p-5 text-left transition ${
        desactivee
          ? "cursor-not-allowed border-soil-700 opacity-40"
          : choisie
            ? "border-lamp bg-lamp/10"
            : "border-soil-600 bg-soil-850 hover:border-soil-500"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl font-bold uppercase tracking-wide text-moss-100">{titre}</span>
        {recommandee && (
          <span className="puce border-gene-g/50 text-gene-g">recommandé</span>
        )}
      </div>
      <div className="mt-0.5 text-[13px] text-moss-400">{sousTitre}</div>

      <div
        className={`mt-4 font-display text-4xl font-bold leading-none ${
          proba >= 0.999 ? "text-gene-g" : proba > 0 ? "text-lamp-glow" : "text-gene-w"
        }`}
      >
        {(proba * 100).toFixed(0)} %
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-moss-400">
        {cycles} cycle{cycles > 1 ? "s" : ""} de pousse
      </div>

      <p className="mt-3 border-t border-soil-700 pt-3 text-[13px] leading-snug text-moss-200">{argument}</p>
    </button>
  );
}

function BlocEtape({
  numero,
  sur,
  titre,
  plan,
  resultat,
  proba,
  explications,
  note,
  apres,
}: {
  numero?: number;
  sur?: number;
  titre: string;
  plan: { centre: Genome; donneurs: Genome[] };
  resultat: Genome;
  proba: number;
  cible: Genome;
  explications?: ReturnType<typeof expliquerPlant>;
  note?: string;
  apres?: React.ReactNode;
}) {
  const grille: (Genome | null)[] = Array(9).fill(null);
  grille[4] = plan.centre;
  plan.donneurs.forEach((d, i) => {
    if (i < AUTOUR.length) grille[AUTOUR[i]] = d;
  });

  return (
    <section className="rounded-lg border border-soil-600 bg-soil-850 p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        {numero && (
          <span className="font-mono text-[12px] uppercase tracking-wider text-lamp-glow">
            {sur ? `étape ${numero} sur ${sur}` : `étape ${numero}`}
          </span>
        )}
        <h3 className="titre text-xl">{titre}</h3>
        <span className="ml-auto font-mono text-[13px] text-moss-400">
          {(proba * 100).toFixed(0)} % de réussite
        </span>
      </div>

      <div className="mt-4">
        <div className="eyebrow mb-2">Au centre — c&apos;est lui que tu améliores</div>
        <span className="inline-flex rounded border border-lamp bg-lamp/10 px-3 py-2">
          <ChaineGenes genome={plan.centre} taille="md" />
        </span>
      </div>

      <div className="mt-4">
        <div className="eyebrow mb-2">
          Autour — {plan.donneurs.length} donneuse{plan.donneurs.length > 1 ? "s" : ""}, n&apos;importe où
          tant qu&apos;elles touchent le milieu
        </div>
        <div className="flex flex-wrap gap-1.5">
          {plan.donneurs.map((d, i) => (
            <span key={i} className="inline-flex rounded border border-soil-600 bg-soil-900 px-2 py-1.5">
              <ChaineGenes genome={d} taille="sm" />
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid max-w-xs grid-cols-3 gap-1.5">
        {grille.map((g, i) => (
          <div
            key={i}
            className={`flex min-h-[36px] items-center justify-center rounded border ${
              i === 4 ? "border-lamp bg-lamp/15" : g ? "border-soil-500 bg-soil-800" : "border-dashed border-soil-600"
            }`}
          >
            {g ? (
              <span className="font-mono text-[11px] text-moss-100">{formatGenome(g)}</span>
            ) : (
              <span className="font-mono text-[10px] text-moss-400">vide</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-soil-700 pt-4">
        <div className="eyebrow mb-2">Ce que tu obtiens</div>
        <ChaineGenes genome={resultat} taille="lg" />
      </div>

      {note && <p className="mt-3 font-mono text-[12px] text-moss-400">{note}</p>}
      {apres}

      {explications && (
        <details className="mt-5 border-t border-soil-700 pt-4">
          <summary className="cursor-pointer font-display text-[15px] font-semibold uppercase tracking-wide text-moss-200 hover:text-moss-100">
            Pourquoi ça marche, case par case
          </summary>
          <div className="mt-4">
            <ExplicationCases cases={explications} />
          </div>
        </details>
      )}
    </section>
  );
}

function AlerteDonneuses({ plan, cible }: { plan: Plan; cible: Genome }) {
  const grille: (Genome | null)[] = Array(9).fill(null);
  grille[4] = plan.centre.genome;
  plan.donneurs.forEach((d, i) => {
    if (i < AUTOUR.length) grille[AUTOUR[i]] = d.genome;
  });
  const analyse = analyserBac(grille, cible);
  const menacees = AUTOUR.map((i) => analyse[i]).filter((r) => r.genome && r.derive.probaPerte >= 0.25).length;

  if (menacees === 0) return null;
  return (
    <div className="mt-4">
      <Note ton="alerte">
        {menacees} de tes donneuses risquent de ressortir moins bonnes qu&apos;elles n&apos;y sont entrées :
        elles se font réécrire par leurs voisines, exactement comme le plant du milieu. Garde des copies en
        caisse avant de lancer le cycle.
      </Note>
    </div>
  );
}

function MarcheASuivre({ deuxTemps }: { deuxTemps: boolean }) {
  const etapes = [
    "Mets en caisse une copie de chaque graine du plan. Si le croisement rate, tu recommences ; si tu n'as plus de donneuse, tu repars de zéro.",
    "Plante la graine du milieu sur la case centrale du grand bac.",
    "Plante les donneuses autour, n'importe où tant qu'elles touchent le milieu.",
    "Eau, lumière et température au maximum. Un plafonnier par bac suffit pour la lumière.",
    "Lance un minuteur, puis va faire autre chose.",
    "Quand le plant du milieu passe en stade Croisement, reviens : c'est là que ses gènes sont recalculés, et c'est là que tu peux enfin lire son résultat.",
    deuxTemps
      ? "Inspecte-le. Si le pont est bon, prends-en trois boutures — hache en main — puis passe à l'étape 2. Sinon, récolte et recommence avec tes copies."
      : "Inspecte-le. Si le résultat est bon, bouture-le — hache en main. Sinon, récolte et recommence avec tes copies.",
  ];

  return (
    <section className="mt-8">
      <h3 className="titre mb-3 text-xl">Marche à suivre en jeu</h3>
      <ol className="space-y-2">
        {etapes.map((texte, i) => (
          <li key={i} className="flex gap-4 rounded border border-soil-600 bg-soil-850 p-3">
            <span className="font-mono text-base font-bold text-lamp/70">{i + 1}</span>
            <span className="text-[14px] leading-snug text-moss-200">{texte}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-moss-400">
        <Link href="/minuteurs" className="text-lamp-glow underline underline-offset-2">
          Lance le minuteur
        </Link>{" "}
        en même temps que tu plantes : les gènes sont recalculés au démarrage du stade Croisement, et tu peux bouturer jusqu'à ce que le plant dépérisse.
      </p>
    </section>
  );
}

function Etape({
  numero,
  titre,
  resume,
  dernier,
  children,
}: {
  numero: number;
  titre: string;
  resume?: string;
  dernier?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative pl-11 ${dernier ? "" : "pb-10"}`}>
      {!dernier && <span className="absolute left-[15px] top-9 h-full w-px bg-soil-600" aria-hidden />}
      <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-lamp/60 bg-soil-900 font-display text-base font-bold text-lamp-glow">
        {numero}
      </span>
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h2 className="titre text-2xl leading-none">{titre}</h2>
        {resume && <span className="font-mono text-[13px] text-moss-400">{resume}</span>}
      </div>
      {children}
    </section>
  );
}
