"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlerteConditions } from "@/components/Conditions";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { ExplicationCases } from "@/components/Explication";
import { DeriveDuPlan } from "@/components/Derive";
import { Details, EnTetePage, Note, Page } from "@/components/Ui";
import { VoirAussi } from "@/components/VoirAussi";
import { GENOMES_CIBLES, PLANTES, type Genome, type PlanteId } from "@/data/game";
import {
  expliquerPlant,
  extraireDepuisTexte,
  formatGenome,
  diagnostiquerBanque,
  optimiserBac,
  parseGenome,
  planifierRoutes,
  scoreGenome,
  type EntreeBanque,
  type EtapeRoute,
  type Route,
} from "@/lib/crossbreed";
import { useGraines } from "@/lib/graines";
import { SourceGrainesBandeau } from "@/components/SourceGraines";
import { decoderEtat, ecrireFragment, lienComplet } from "@/lib/partage";

const AUTOUR = [0, 1, 2, 3, 5, 6, 7, 8];

export default function PageGenesParfaits() {
  const [plante, setPlante] = useState<PlanteId>("chanvre");
  const {
    graines,
    source,
    modifiable,
    ferme,
    nbLocal,
    enAttente,
    ajouterLot,
    viderTout,
    transfererDepuisLocal,
  } = useGraines(plante);
  const [cible, setCible] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);
  const [colle, setColle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [choix, setChoix] = useState<number | null>(null);
  const [lienCopie, setLienCopie] = useState(false);
  const [partageRecu, setPartageRecu] = useState<{ genome: Genome; quantite: number }[] | null>(null);

  const nbGraines = graines.reduce((a, g) => a + g.quantite, 0);

  const entrees: EntreeBanque[] = useMemo(
    () => graines.map((g) => ({ id: g.id, genome: g.genome, quantite: g.quantite })),
    [graines]
  );

  const routes = useMemo(
    () => (entrees.length > 0 ? planifierRoutes(entrees, cible) : []),
    [entrees, cible]
  );

  // Recommandation : la route qui coûte le moins de cycles en moyenne. À égalité
  // — cas fréquent — on préfère celle dont l'étape la plus risquée est la plus
  // sûre, parce qu'une route certaine évite les mauvaises surprises.
  const recommandee = useMemo(() => {
    if (routes.length === 0) return null;
    return [...routes].sort(
      (a, b) => a.cyclesAttendus - b.cyclesAttendus || b.pireEtape - a.pireEtape
    )[0];
  }, [routes]);

  const routeActive =
    routes.find((r) => r.generations === choix) ?? recommandee ?? null;

  // Au-delà de trois options, la comparaison devient illisible — surtout sur
  // téléphone, où les cartes s'empilent et repoussent le plan hors de l'écran.
  // On garde les routes les plus courtes, en s'assurant que la recommandée y est.
  const routesAffichees = useMemo(() => {
    const gardees = routes.slice(0, 3);
    if (recommandee && !gardees.some((r) => r.generations === recommandee.generations)) {
      gardees[gardees.length - 1] = recommandee;
    }
    return gardees.sort((a, b) => a.generations - b.generations);
  }, [routes, recommandee]);

  const diagnostic = useMemo(
    () => (entrees.length > 0 ? diagnostiquerBanque(entrees, cible) : []),
    [entrees, cible]
  );
  const casesBloquees = diagnostic.filter((d) => d.bloque);

  // --- Permalien -------------------------------------------------------------

  useEffect(() => {
    const recu = decoderEtat(window.location.hash);
    if (!recu) return;
    if (recu.plante) setPlante(recu.plante);
    if (recu.cible) setCible(recu.cible);
    if (recu.graines) setPartageRecu(recu.graines);
  }, []);

  useEffect(() => {
    ecrireFragment({
      plante,
      cible,
      graines: graines.map((g) => ({ genome: g.genome, quantite: g.quantite })),
    });
  }, [plante, cible, graines]);

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(
        lienComplet({
          plante,
          cible,
          graines: graines.map((g) => ({ genome: g.genome, quantite: g.quantite })),
        })
      );
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2500);
    } catch {
      setMessage("Copie impossible — sélectionne l'adresse dans la barre du navigateur.");
    }
  }

  async function importerPartage() {
    if (!partageRecu) return;
    // Une graine reçue en quantité 3 est ajoutée trois fois : le hook regroupe.
    const aAjouter = partageRecu.flatMap(({ genome, quantite }) =>
      Array.from({ length: quantite }, () => genome)
    );
    await ajouterLot(aAjouter, plante, "import");
    setPartageRecu(null);
    setMessage("Graines du lien ajoutées.");
  }

  const apercuImport = useMemo(() => extraireDepuisTexte(colle), [colle]);

  async function importer() {
    if (apercuImport.length === 0) return;
    await ajouterLot(apercuImport, plante);
    setMessage(`${apercuImport.length} graine${apercuImport.length > 1 ? "s" : ""} ajoutée${apercuImport.length > 1 ? "s" : ""}.`);
    setColle("");
  }

  function toutSupprimer() {
    const n = graines.reduce((a, g) => a + g.quantite, 0);
    const nom = PLANTES.find((p) => p.id === plante)?.nom.toLowerCase();
    if (!confirm(`Supprimer les ${n} graines de ${nom} ? Cette action est définitive.`)) return;
    void viderTout(plante);
    setMessage("Graines supprimées.");
  }

  return (
    <Page>
      <EnTetePage
        titre="Obtenir les gènes parfaits"
        intro="Tu dis ce que tu as, tu dis ce que tu veux, le site te donne la disposition exacte et t'explique chaque case."
      />

      <p className="-mt-4 mb-6 rounded border-l-2 border-nuit-500 py-2 pl-3 text-[13px] leading-relaxed text-feuille-400">
        Tout cet outil suppose un <span className="text-feuille-100">grand bac</span>, et seulement lui. Le
        croisement dépend du nombre de voisines qu&apos;un plant touche : un bac triangulaire ou un pot n&apos;ont
        pas la même disposition, donc pas les mêmes probabilités. Garde-les pour la production, pas pour la
        génétique.
      </p>

      <SourceGrainesBandeau
        source={source}
        nomFerme={ferme?.nom}
        nbLocal={nbLocal}
        enAttente={enAttente}
        modifiable={modifiable}
        onTransferer={transfererDepuisLocal}
      />

      <AlerteConditions />

      {partageRecu && (
        <div className="mb-6 rounded-lg border border-lampe/50 bg-lampe/10 p-4">
          <div className="font-display text-[15px] font-semibold uppercase tracking-wide text-lampe-chaud">
            Plan partagé
          </div>
          <p className="mt-1 text-[14px] leading-relaxed text-feuille-200">
            Ce lien contient {partageRecu.reduce((a, g) => a + g.quantite, 0)} graines. Elles ne sont pas
            encore dans ta banque — le plan ci-dessous se calcule sur les tiennes.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className="bouton bouton-primaire" onClick={() => void importerPartage()}>
              Ajouter à mes graines
            </button>
            <button type="button" className="bouton" onClick={() => setPartageRecu(null)}>
              Ignorer
            </button>
            <span className="flex flex-wrap gap-1">
              {partageRecu.slice(0, 8).map((g, i) => (
                <ChaineGenes key={i} genome={g.genome} taille="sm" />
              ))}
            </span>
          </div>
        </div>
      )}

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
            <p className="mb-3 text-[14px] leading-relaxed text-feuille-200">
              Colle les gènes de tes graines, tels que tu les lis en jeu. Séparateurs libres. Tu peux aussi{" "}
              <Link href="/scanner" className="text-lampe-chaud underline underline-offset-2">
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
              onClick={() => void importer()}
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
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2 py-1"
                  >
                    <ChaineGenes genome={g.genome} taille="sm" />
                    <span className="font-mono text-[11px] text-feuille-400">×{g.quantite}</span>
                  </span>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <details className="w-full">
                <summary className="cursor-pointer font-mono text-[12px] uppercase tracking-wider text-feuille-400 hover:text-feuille-200">
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
                  onClick={() => void importer()}
                  disabled={apercuImport.length === 0}
                >
                  Ajouter {apercuImport.length > 0 && apercuImport.length}
                </button>
              </details>

              <button type="button" className="bouton bouton-danger" onClick={toutSupprimer}>
                Tout supprimer
              </button>
              <Link href="/genetique" className="font-mono text-[12px] text-feuille-400 hover:text-lampe-chaud">
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
                  actif ? "border-lampe bg-lampe/10" : "border-white/10 bg-nuit-800 hover:border-nuit-500"
                }`}
              >
                {g && <ChaineGenes genome={g} taille="sm" />}
                <span
                  className={`font-display text-[15px] font-semibold uppercase tracking-wide ${
                    actif ? "text-lampe-chaud" : "text-feuille-100"
                  }`}
                >
                  {c.libelle}
                </span>
                <span className="w-full text-[13px] leading-snug text-feuille-400 sm:w-auto sm:flex-1">
                  {c.pour}
                </span>
              </button>
            );
          })}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer font-mono text-[12px] uppercase tracking-wider text-feuille-400 hover:text-feuille-200">
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
          <p className="text-[15px] text-feuille-400">Commence par ajouter tes graines à l&apos;étape 1.</p>
        ) : routes.length === 0 ? (
          <div>
            <Note ton="alerte">
              Aucune route trouvée vers {formatGenome(cible)}, même en cinq générations.
            </Note>
            {casesBloquees.length > 0 && (
              <div className="mt-4 panneau">
                <h3 className="titre text-lg">Ce qui bloque</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-feuille-400">
                  Il faut au moins deux graines portant le bon gène dans une case pour déloger un rouge. En
                  dessous, c&apos;est mathématiquement impossible, quelle que soit ta patience.
                </p>
                <ul className="mt-4 space-y-1.5">
                  {diagnostic.map((d) => (
                    <li
                      key={d.index}
                      className={`flex items-center gap-3 rounded border px-3 py-2 ${
                        d.bloque ? "border-gene-w/50 bg-gene-w/8" : "border-white/10"
                      }`}
                    >
                      <span className="font-mono text-[12px] text-feuille-400">case {d.index + 1}</span>
                      <span className="font-mono text-[14px] font-bold text-feuille-100">{d.geneCible}</span>
                      <span className={`ml-auto font-mono text-[13px] ${d.bloque ? "text-gene-w" : "text-feuille-400"}`}>
                        {d.porteuses} graine{d.porteuses > 1 ? "s" : ""} en stock
                        {d.bloque && " — il en faut 2"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[14px] leading-relaxed text-feuille-200">
                  Retourne ramasser des graines sauvages en visant précisément ces cases-là, ou choisis une
                  cible moins exigeante à l&apos;étape 2.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Comparaison des routes */}
            <div className="grid gap-3 sm:grid-cols-2">
              {routesAffichees.map((r) => (
                <CarteRoute
                  key={r.generations}
                  route={r}
                  choisie={routeActive?.generations === r.generations}
                  recommandee={recommandee?.generations === r.generations}
                  onClick={() => setChoix(r.generations)}
                />
              ))}
            </div>

            {recommandee && recommandee.generations > 1 && (
              <div className="mt-4">
                <Note>
                  <span className="text-feuille-100">Pourquoi passer par plusieurs générations.</span> Viser les
                  gènes parfaits d&apos;un coup demande de corriger plusieurs cases en même temps, et il suffit
                  qu&apos;une seule tombe mal pour tout perdre. En fabriquant un pont, tu corriges une partie
                  des cases, tu <span className="text-feuille-100">bouture</span> le résultat — il est alors acquis
                  pour de bon — et tu repars de cette base. Souvent, c&apos;est le même temps en moyenne, mais
                  sans aucun coup de dé.
                </Note>
              </div>
            )}

            {routeActive && (
              <div className="mt-8 space-y-8">
                {routeActive.etapes.map((e, i) => (
                  <BlocEtape
                    key={i}
                    numero={i + 1}
                    sur={routeActive.etapes.length}
                    titre={e.finale ? "Vise les gènes parfaits" : "Fabrique un pont"}
                    plan={{ centre: e.centre.genome, donneurs: e.donneurs.map((d) => d.genome) }}
                    resultat={e.resultat}
                    proba={e.probabilite}
                    cible={cible}
                    explications={
                      e.finale
                        ? expliquerPlant(e.centre.genome, e.donneurs.map((d) => d.genome), cible)
                        : undefined
                    }
                    apres={
                      e.finale ? undefined : (
                        <p className="mt-4 rounded border-l-2 border-lampe py-2 pl-3 text-[14px] leading-relaxed text-feuille-200">
                          <span className="text-feuille-100">L&apos;étape à ne pas rater :</span> une fois ce plant
                          passé en stade Croisement, prends-en{" "}
                          <span className="text-feuille-100">trois boutures</span>. Elles copient les gènes à
                          l&apos;identique — c&apos;est ce qui rend l&apos;étape suivante fiable. Sans ça, tu
                          n&apos;as qu&apos;un exemplaire et tout repose encore sur la chance.
                        </p>
                      )
                    }
                  />
                ))}

                <div className="rounded-lg border border-lampe/40 bg-lampe/8 p-5">
                  <div className="eyebrow">Bout en bout</div>
                  <div className="font-display text-3xl font-bold text-lampe-chaud">
                    {routeActive.cyclesAttendus.toFixed(1)} cycles
                  </div>
                  <p className="mt-1 text-[14px] text-feuille-200">
                    de pousse en moyenne, reprises comprises.{" "}
                    {routeActive.pireEtape >= 0.999
                      ? "Aucune étape ne repose sur la chance."
                      : `L'étape la plus risquée passe à ${(routeActive.pireEtape * 100).toFixed(0)} %.`}
                  </p>
                </div>
              </div>
            )}

            <MarcheASuivre pont={(routeActive?.etapes.length ?? 1) > 1} />

            <section className="mt-8 panneau">
              <h3 className="titre text-lg">Partager ce plan</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-feuille-400">
                Le lien contient tes graines, ta cible et ta plante. La personne qui l&apos;ouvre voit
                exactement le même plan, sans rien avoir à saisir.
              </p>
              <button type="button" className="bouton bouton-primaire mt-4" onClick={copierLien}>
                {lienCopie ? "Lien copié" : "Copier le lien"}
              </button>
            </section>

          </>
        )}
      </Etape>

      <div className="mt-12">
        <Details titre="La règle du croisement, en entier">
          <div className="space-y-3 text-[14px] leading-relaxed text-feuille-200">
            <p>
              Chaque graine porte six cases de gène. Quand un plant entre en stade Croisement, chacune de ses
              six cases est rejouée <span className="text-feuille-100">séparément</span> — ce qui se passe dans la
              case 1 n&apos;influence pas la case 2.
            </p>
            <p>
              Pour une case donnée, toutes les plantes qui touchent le plant votent, diagonales comprises.
              Chaque voisine apporte le poids de son propre gène dans cette case : G, Y et H pèsent 0,6 ; W et
              X pèsent 1,0. On additionne par type de gène.
            </p>
            <p>
              Le gène qui totalise le plus l&apos;emporte —{" "}
              <span className="text-feuille-100">à condition de dépasser strictement</span> le poids du gène déjà
              en place. À égalité, le plant garde le sien : il défend sa position.
            </p>
            <p>
              D&apos;où la règle qui gouverne tout :{" "}
              <span className="text-feuille-100">il faut deux donneuses vertes pour déloger un rouge</span> (1,2
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
          <div className="space-y-3 text-[14px] leading-relaxed text-feuille-200">
            <p>
              Une <span className="text-feuille-100">graine</span> plantée se croise avec ses voisines : c&apos;est
              par elle que tu fais évoluer des gènes.
            </p>
            <p>
              Une <span className="text-feuille-100">bouture</span> copie les six gènes du parent sans aucun
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
      <VoirAussi
        liens={[
          { href: "/scanner", label: "Scanner", detail: "Lire les gènes directement à l'écran plutôt que les saisir." },
          { href: "/genetique", label: "Mes graines", detail: "La banque dans laquelle l'assistant pioche." },
          { href: "/rendement", label: "Rendement", detail: "Ce que la génétique obtenue va vraiment rapporter." },
          { href: "/minuteurs", label: "Minuteurs", detail: "Lancer le décompte au moment où tu plantes le bac." },
        ]}
      />

    </Page>
  );
}

// -----------------------------------------------------------------------------

function CarteRoute({
  route,
  choisie,
  recommandee,
  onClick,
}: {
  route: Route;
  choisie: boolean;
  recommandee?: boolean;
  onClick: () => void;
}) {
  const sur = route.pireEtape >= 0.999;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-5 text-left transition ${
        choisie ? "border-lampe bg-lampe/10" : "border-white/10 bg-nuit-800 hover:border-nuit-500"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl font-bold uppercase tracking-wide text-feuille-100">
          {route.generations === 1
            ? "En une fois"
            : `En ${route.generations} fois`}
        </span>
        {recommandee && <span className="puce border-gene-g/50 text-gene-g">recommandé</span>}
      </div>
      <div className="mt-0.5 text-[13px] text-feuille-400">
        {route.generations === 1 ? "Le coup direct" : `${route.generations - 1} pont${route.generations > 2 ? "s" : ""}, puis la cible`}
      </div>

      <div className={`mt-4 font-display text-4xl font-bold leading-none ${sur ? "text-gene-g" : "text-lampe-chaud"}`}>
        {route.cyclesAttendus.toFixed(1)}
      </div>
      <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-feuille-400">
        cycles de pousse attendus
      </div>

      <p className="mt-3 border-t border-white/[0.07] pt-3 text-[13px] leading-snug text-feuille-200">
        {sur
          ? "Aucune étape ne repose sur la chance : le résultat est acquis à chaque cycle."
          : `L'étape la plus risquée passe à ${(route.pireEtape * 100).toFixed(0)} %. Prévois des copies pour retenter.`}
      </p>
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
  apres?: ReactNode;
}) {
  const grille: (Genome | null)[] = Array(9).fill(null);
  grille[4] = plan.centre;
  plan.donneurs.forEach((d, i) => {
    if (i < AUTOUR.length) grille[AUTOUR[i]] = d;
  });

  return (
    <section className="panneau">
      <div className="flex flex-wrap items-baseline gap-3">
        {numero && (
          <span className="font-mono text-[12px] uppercase tracking-wider text-lampe-chaud">
            {sur ? `étape ${numero} sur ${sur}` : `étape ${numero}`}
          </span>
        )}
        <h3 className="titre text-xl">{titre}</h3>
        <span className="ml-auto font-mono text-[13px] text-feuille-400">
          {(proba * 100).toFixed(0)} % de réussite
        </span>
      </div>

      <div className="mt-4">
        <div className="eyebrow mb-2">Au centre — c&apos;est lui que tu améliores</div>
        <span className="inline-flex rounded border border-lampe bg-lampe/10 px-3 py-2">
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
            <span key={i} className="inline-flex rounded-xl border border-white/10 bg-black/20 px-2 py-1.5">
              <ChaineGenes genome={d} taille="sm" />
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-1.5">
        {grille.map((g, i) => (
          <div
            key={i}
            className={`flex min-h-[36px] items-center justify-center rounded border ${
              i === 4 ? "border-lampe bg-lampe/15" : g ? "border-nuit-500 bg-nuit-700" : "border-dashed border-white/10"
            }`}
          >
            {g ? (
              <span className="font-mono text-[10px] text-feuille-100 sm:text-[11px]">{formatGenome(g)}</span>
            ) : (
              <span className="font-mono text-[10px] text-feuille-400">vide</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-white/[0.07] pt-4">
        <div className="eyebrow mb-2">Ce que tu obtiens</div>
        <ChaineGenes genome={resultat} taille="lg" />
      </div>

      {note && <p className="mt-3 font-mono text-[12px] text-feuille-400">{note}</p>}
      {apres}

      {explications && (
        <details className="mt-5 border-t border-white/[0.07] pt-4">
          <summary className="cursor-pointer font-display text-[15px] font-semibold uppercase tracking-wide text-feuille-200 hover:text-feuille-100">
            Pourquoi ça marche, case par case
          </summary>
          <div className="mt-4">
            <ExplicationCases cases={explications} />
          </div>
        </details>
      )}

      {/* Ce que le plan coûte aux donneuses : le moteur le calculait déjà,
          rien ne l'affichait. */}
      <div className="mt-4">
        <DeriveDuPlan grille={grille} />
      </div>
    </section>
  );
}

function MarcheASuivre({ pont }: { pont: boolean }) {
  const etapes = [
    "Mets en caisse une copie de chaque graine du plan. Si le croisement rate, tu recommences ; si tu n'as plus de donneuse, tu repars de zéro.",
    "Plante la graine du milieu sur la case centrale du grand bac.",
    "Plante les donneuses autour, n'importe où tant qu'elles touchent le milieu.",
    "Eau, lumière et température au maximum. Un plafonnier par bac suffit pour la lumière.",
    "Lance un minuteur, puis va faire autre chose.",
    "Quand le plant du milieu passe en stade Croisement, reviens : c'est là que ses gènes sont recalculés, et c'est là que tu peux enfin lire son résultat.",
    pont
      ? "Inspecte-le. Si le pont est bon, prends-en trois boutures — hache en main — puis passe à l'étape suivante. Sinon, récolte et recommence avec tes copies."
      : "Inspecte-le. Si le résultat est bon, bouture-le — hache en main. Sinon, récolte et recommence avec tes copies.",
  ];

  return (
    <section className="mt-8">
      <h3 className="titre mb-3 text-xl">Marche à suivre en jeu</h3>
      <ol className="space-y-2">
        {etapes.map((texte, i) => (
          <li key={i} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="font-mono text-base font-bold text-lampe/70">{i + 1}</span>
            <span className="text-[14px] leading-snug text-feuille-200">{texte}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-feuille-400">
        <Link href="/minuteurs" className="text-lampe-chaud underline underline-offset-2">
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
  children: ReactNode;
}) {
  return (
    <section className={`relative pl-11 ${dernier ? "" : "pb-10"}`}>
      {!dernier && <span className="absolute left-[15px] top-9 h-full w-px bg-white/10" aria-hidden />}
      <span className="fente absolute left-0 top-0 h-8 w-8 font-mono text-[15px] font-bold text-braise">
        {numero}
      </span>
      <div className="mb-4 flex flex-wrap items-baseline gap-3">
        <h2 className="titre text-2xl leading-none">{titre}</h2>
        {resume && <span className="font-mono text-[13px] text-feuille-400">{resume}</span>}
      </div>
      {children}
    </section>
  );
}
