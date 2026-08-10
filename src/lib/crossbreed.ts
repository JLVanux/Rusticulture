import { GENES, GENE_LETTERS, type GeneLetter, type Genome } from "@/data/game";

// -----------------------------------------------------------------------------
// Règle de croisement (patch 2026)
//
// Chaque case de gène est résolue indépendamment des cinq autres.
// Pour une case :
//   1. On additionne le poids de chaque plant voisin, par type de gène.
//      G / Y / H pèsent 0,6 · W / X pèsent 1,0.
//   2. Le gène qui totalise le plus l'emporte — mais seulement si son total
//      dépasse STRICTEMENT le poids du gène déjà en place sur le plant.
//   3. Égalité entre plusieurs gènes donneurs : tirage au sort équiprobable.
//
// Conséquence pratique : pour déloger un W ou un X (poids 1,0), il faut au
// moins DEUX donneurs portant le même gène vert dans cette case (1,2 > 1,0).
// Un seul donneur vert (0,6) ne suffit jamais.
// -----------------------------------------------------------------------------

export type Distribution = Partial<Record<GeneLetter, number>>;

/** Distribution de probabilité du gène obtenu sur une case, après croisement. */
export function resoudreCase(geneCentre: GeneLetter, genesVoisins: GeneLetter[]): Distribution {
  const totaux = new Map<GeneLetter, number>();
  for (const g of genesVoisins) {
    totaux.set(g, (totaux.get(g) ?? 0) + GENES[g].poids);
  }

  const poidsCentre = GENES[geneCentre].poids;
  let meilleur = 0;
  for (const v of totaux.values()) meilleur = Math.max(meilleur, v);

  // Personne ne bat le gène en place : il reste.
  if (meilleur <= poidsCentre + 1e-9) return { [geneCentre]: 1 };

  const gagnants = [...totaux.entries()]
    .filter(([, v]) => Math.abs(v - meilleur) < 1e-9)
    .map(([g]) => g);

  const p = 1 / gagnants.length;
  const dist: Distribution = {};
  for (const g of gagnants) dist[g] = (dist[g] ?? 0) + p;
  return dist;
}

/** Les six distributions, une par case. */
export function resoudrePlant(centre: Genome, voisins: Genome[]): Distribution[] {
  return centre.map((gene, i) => resoudreCase(gene, voisins.map((v) => v[i])));
}

/** Probabilité d'obtenir exactement ces gènes. */
export function probabiliteCible(centre: Genome, voisins: Genome[], cible: Genome): number {
  const dists = resoudrePlant(centre, voisins);
  return dists.reduce((acc, d, i) => acc * (d[cible[i]] ?? 0), 1);
}


/** Score d'une série de gènes : somme des scores de chaque case. Sert à trier une banque de graines. */
const SCORES: Record<GeneLetter, number> = { G: 3, Y: 2.5, H: 0.5, W: -1, X: 0 };
export function scoreGenome(g: Genome): number {
  return g.reduce((a, l) => a + SCORES[l], 0);
}

// -----------------------------------------------------------------------------
// Dérive : ce que le plant risque de PERDRE.
//
// Un plant posé dans un bac n'est pas seulement une donneuse : il se fait
// réécrire par ses voisins, exactement comme le plant central. Une bonne graine
// entourée de déchets peut en ressortir moins bonne qu'elle n'y est entrée.
// C'est le piège que personne ne voit venir, alors on le chiffre.
//
// Les six cases étant indépendantes, on convole leurs distributions de variation
// de score. Le résultat est exact, pas simulé.
// -----------------------------------------------------------------------------

export function distributionDelta(centre: Genome, voisins: Genome[]): Map<number, number> {
  const dists = resoudrePlant(centre, voisins);
  let acc = new Map<number, number>([[0, 1]]);

  dists.forEach((d, i) => {
    const suivant = new Map<number, number>();
    for (const [delta, p] of acc) {
      for (const l of GENE_LETTERS) {
        const pl = d[l] ?? 0;
        if (pl <= 0) continue;
        // Arrondi au demi-point : les scores sont tous des multiples de 0,5.
        const nouveau = Math.round((delta + SCORES[l] - SCORES[centre[i]]) * 2) / 2;
        suivant.set(nouveau, (suivant.get(nouveau) ?? 0) + p * pl);
      }
    }
    acc = suivant;
  });

  return acc;
}

export interface Derive {
  /** Probabilité de ressortir strictement moins bon qu'à l'entrée. */
  probaPerte: number;
  /** Probabilité de ressortir strictement meilleur. */
  probaGain: number;
  /** Variation de score attendue, en moyenne. */
  esperance: number;
}

export function calculerDerive(centre: Genome, voisins: Genome[]): Derive {
  const dist = distributionDelta(centre, voisins);
  let probaPerte = 0;
  let probaGain = 0;
  let esperance = 0;
  for (const [delta, p] of dist) {
    if (delta < -1e-9) probaPerte += p;
    else if (delta > 1e-9) probaGain += p;
    esperance += delta * p;
  }
  return { probaPerte, probaGain, esperance };
}

// -----------------------------------------------------------------------------
// Grille 3×3 d'un grand bac
// -----------------------------------------------------------------------------

/** Index des cases adjacentes (orthogonales + diagonales) dans une grille 3×3. */
export function voisinsGrille(index: number): number[] {
  const l = Math.floor(index / 3);
  const c = index % 3;
  const out: number[] = [];
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dl === 0 && dc === 0) continue;
      const nl = l + dl;
      const nc = c + dc;
      if (nl < 0 || nl > 2 || nc < 0 || nc > 2) continue;
      out.push(nl * 3 + nc);
    }
  }
  return out;
}

export interface ResultatCase {
  index: number;
  genome: Genome | null;
  distributions: Distribution[];
  probaCible: number;
  probaSansRouge: number;
  /** Les gènes les plus probables en sortie. */
  genomeAttendu: Genome | null;
  derive: Derive;
  /** Nombre de voisins qui votent sur ce plant. */
  nbVoisins: number;
}

const DERIVE_NULLE: Derive = { probaPerte: 0, probaGain: 0, esperance: 0 };


// -----------------------------------------------------------------------------
// Optimiseur : quelle disposition mettre dans le bac ?
//
// Seule la case centrale touche les huit autres, donc c'est elle qu'on optimise.
// L'ordre des huit donneurs autour n'a aucune importance : le problème se
// ramène à choisir un plant central + un multiensemble de donneurs.
// Recherche gloutonne suivie d'une recherche locale — rapide et quasi optimale.
// -----------------------------------------------------------------------------

export interface EntreeBanque {
  id: string;
  genome: Genome;
  quantite: number;
  etiquette?: string;
}

export interface Plan {
  centre: EntreeBanque;
  donneurs: EntreeBanque[];
  probabilite: number;
  distributions: Distribution[];
}

function evaluer(centre: Genome, donneurs: Genome[], cible: Genome): number {
  return probabiliteCible(centre, donneurs, cible);
}

/**
 * Guide de recherche.
 *
 * On ne peut pas grimper directement sur la probabilité : elle vaut zéro tant
 * qu'une seule des six cases est fausse, donc la recherche n'a aucune pente à
 * suivre et ne démarre jamais. La somme des logarithmes, elle, donne un
 * gradient case par case : améliorer une seule case fait monter le guide même
 * si la probabilité reste nulle.
 */
function guide(centre: Genome, donneurs: Genome[], cible: Genome): number {
  const dists = resoudrePlant(centre, donneurs);
  return dists.reduce((acc, d, i) => acc + Math.log((d[cible[i]] ?? 0) + 1e-6), 0);
}

export function optimiserBac(banque: EntreeBanque[], cible: Genome): Plan | null {
  const dispo = banque.filter((e) => e.quantite > 0);
  if (dispo.length === 0) return null;

  let meilleurPlan: Plan | null = null;

  for (const centre of dispo) {
    // Le plant central consomme un exemplaire.
    const restant = new Map(dispo.map((e) => [e.id, e.quantite]));
    restant.set(centre.id, (restant.get(centre.id) ?? 0) - 1);

    const libre = (id: string) => (restant.get(id) ?? 0) > 0;
    const prendre = (e: EntreeBanque) => restant.set(e.id, (restant.get(e.id) ?? 0) - 1);
    const rendre = (e: EntreeBanque) => restant.set(e.id, (restant.get(e.id) ?? 0) + 1);

    let donneurs: EntreeBanque[] = [];
    let score = guide(centre.genome, [], cible);

    // Phase de construction. On teste l'ajout d'un donneur ET l'ajout de deux
    // d'un coup : deux, c'est le pas minimal pour déloger un gène rouge
    // (1,2 contre 1,0), et un seul donneur dégrade presque toujours une case
    // déjà correcte. Sans le pas de deux, la recherche reste bloquée à vide.
    for (let k = 0; k < 8; k++) {
      let ajout: EntreeBanque[] | null = null;
      let meilleurScore = score;

      for (const c of dispo) {
        if (!libre(c.id)) continue;
        const s = guide(centre.genome, [...donneurs.map((d) => d.genome), c.genome], cible);
        if (s > meilleurScore + 1e-12) {
          meilleurScore = s;
          ajout = [c];
        }
      }

      if (donneurs.length <= 6) {
        for (let i = 0; i < dispo.length; i++) {
          for (let j = i; j < dispo.length; j++) {
            const a = dispo[i];
            const b = dispo[j];
            if (i === j ? (restant.get(a.id) ?? 0) < 2 : !libre(a.id) || !libre(b.id)) continue;
            const s = guide(
              centre.genome,
              [...donneurs.map((d) => d.genome), a.genome, b.genome],
              cible
            );
            if (s > meilleurScore + 1e-12) {
              meilleurScore = s;
              ajout = [a, b];
            }
          }
        }
      }

      if (!ajout) break;
      for (const c of ajout) {
        donneurs.push(c);
        prendre(c);
      }
      score = meilleurScore;
    }

    // Recherche locale : remplacer un donneur, ou en retirer un devenu nuisible.
    let ameliore = true;
    let gardeFou = 0;
    while (ameliore && gardeFou++ < 60) {
      ameliore = false;

      for (let i = 0; i < donneurs.length && !ameliore; i++) {
        const sortant = donneurs[i];
        for (const c of dispo) {
          if (c.id === sortant.id || !libre(c.id)) continue;
          const essai = [...donneurs];
          essai[i] = c;
          const s = guide(centre.genome, essai.map((d) => d.genome), cible);
          if (s > score + 1e-12) {
            rendre(sortant);
            prendre(c);
            donneurs = essai;
            score = s;
            ameliore = true;
            break;
          }
        }
      }

      for (let i = 0; i < donneurs.length && !ameliore; i++) {
        const essai = donneurs.filter((_, j) => j !== i);
        const s = guide(centre.genome, essai.map((d) => d.genome), cible);
        if (s > score + 1e-12) {
          rendre(donneurs[i]);
          donneurs = essai;
          score = s;
          ameliore = true;
        }
      }
    }

    const probabilite = evaluer(centre.genome, donneurs.map((d) => d.genome), cible);
    if (!meilleurPlan || probabilite > meilleurPlan.probabilite) {
      meilleurPlan = {
        centre,
        donneurs,
        probabilite,
        distributions: resoudrePlant(centre.genome, donneurs.map((d) => d.genome)),
      };
    }
  }

  return meilleurPlan;
}

// -----------------------------------------------------------------------------
// Explication en clair
//
// Les pourcentages ne servent à rien si on ne sait pas d'où ils sortent. Pour
// chaque case, on reconstitue le vote : qui pousse quoi, avec quel poids, et
// pourquoi ça passe ou non.
// -----------------------------------------------------------------------------

export type StatutCase = "acquis" | "gagne" | "egalite" | "perdu" | "menace";

export interface Vote {
  gene: GeneLetter;
  nb: number;
  poids: number;
}

export interface ExplicationCase {
  index: number;
  geneCentre: GeneLetter;
  geneCible: GeneLetter;
  poidsCentre: number;
  votes: Vote[];
  distribution: Distribution;
  probaCible: number;
  statut: StatutCase;
  /** Combien de donneuses portant le gène cible il faudrait ajouter pour gagner. */
  manque: number;
}

export function expliquerPlant(centre: Genome, voisins: Genome[], cible: Genome): ExplicationCase[] {
  return centre.map((geneCentre, i) => {
    const geneCible = cible[i];
    const compte = new Map<GeneLetter, number>();
    for (const v of voisins) compte.set(v[i], (compte.get(v[i]) ?? 0) + 1);

    const votes: Vote[] = [...compte.entries()]
      .map(([gene, nb]) => ({ gene, nb, poids: nb * GENES[gene].poids }))
      .sort((a, b) => b.poids - a.poids);

    const distribution = resoudreCase(geneCentre, voisins.map((v) => v[i]));
    const probaCible = distribution[geneCible] ?? 0;
    const poidsCentre = GENES[geneCentre].poids;

    let statut: StatutCase;
    if (probaCible >= 1 - 1e-9) statut = geneCentre === geneCible ? "acquis" : "gagne";
    else if (probaCible > 1e-9) statut = "egalite";
    else statut = geneCentre === geneCible ? "menace" : "perdu";

    // Poids à dépasser : le meilleur concurrent, ou le plant lui-même.
    const concurrent = votes.find((v) => v.gene !== geneCible)?.poids ?? 0;
    const aBattre = Math.max(concurrent, geneCentre === geneCible ? 0 : poidsCentre);
    const dejaLa = votes.find((v) => v.gene === geneCible)?.poids ?? 0;
    const manque =
      statut === "acquis" || statut === "gagne"
        ? 0
        : Math.max(1, Math.ceil((aBattre - dejaLa + 1e-9) / GENES[geneCible].poids));

    return { index: i, geneCentre, geneCible, poidsCentre, votes, distribution, probaCible, statut, manque };
  });
}

// -----------------------------------------------------------------------------
// Étape intermédiaire
//
// Quand la cible est hors de portée en une génération, la bonne réponse n'est
// pas « impossible » mais « voilà par où passer ». On cherche la disposition qui
// maximise le score attendu du plant central, et on renvoie ce qu'il va très
// probablement devenir : c'est le pont vers la génération suivante.
// -----------------------------------------------------------------------------

export interface PlanProgres {
  centre: EntreeBanque;
  donneurs: EntreeBanque[];
  /** Les gènes les plus probables en sortie. */
  genomeProbable: Genome;
  /** Probabilité d'obtenir exactement ces gènes. */
  probabilite: number;
  /** Cases déjà justes sur le plant de départ, sur 6. */
  casesAvant: number;
  /** Cases justes attendues après croisement, sur 6. */
  casesApres: number;
}

/**
 * Nombre de cases attendues déjà justes par rapport à la cible.
 *
 * C'est l'objectif du pont. On ne cherche pas à maximiser un score générique —
 * ça donnerait un intermédiaire très bon dans l'absolu mais mal orienté, qui ne
 * rapproche pas de la cible. On maximise le nombre de cases correctes, ce qui
 * est à la fois lisse (donc utilisable comme guide) et directement utile.
 */
function casesJustes(centre: Genome, donneurs: Genome[], cible: Genome): number {
  const dists = resoudrePlant(centre, donneurs);
  return dists.reduce((acc, d, i) => acc + (d[cible[i]] ?? 0), 0);
}

function casesJustesDe(genome: Genome, cible: Genome): number {
  return genome.reduce((a, l, i) => a + (l === cible[i] ? 1 : 0), 0);
}

function genomeLePlusProbable(dists: Distribution[]): Genome {
  return dists.map((d) => {
    let best: GeneLetter = "X";
    let bv = -1;
    for (const l of GENE_LETTERS) {
      const v = d[l] ?? 0;
      if (v > bv) {
        bv = v;
        best = l;
      }
    }
    return best;
  }) as Genome;
}

/** Un plan de progrès par plant central possible, du meilleur au moins bon. */
export function plansProgres(banque: EntreeBanque[], cible: Genome): PlanProgres[] {
  const dispo = banque.filter((e) => e.quantite > 0);
  const plans: PlanProgres[] = [];

  for (const centre of dispo) {
    const restant = new Map(dispo.map((e) => [e.id, e.quantite]));
    restant.set(centre.id, (restant.get(centre.id) ?? 0) - 1);
    const libre = (id: string) => (restant.get(id) ?? 0) > 0;

    const donneurs: EntreeBanque[] = [];
    let score = casesJustes(centre.genome, [], cible);

    for (let k = 0; k < 8; k++) {
      let ajout: EntreeBanque[] | null = null;
      let ms = score;

      for (const c of dispo) {
        if (!libre(c.id)) continue;
        const s = casesJustes(centre.genome, [...donneurs.map((d) => d.genome), c.genome], cible);
        if (s > ms + 1e-12) {
          ms = s;
          ajout = [c];
        }
      }
      if (donneurs.length <= 6) {
        for (let i = 0; i < dispo.length; i++) {
          for (let j = i; j < dispo.length; j++) {
            const a = dispo[i];
            const b = dispo[j];
            if (i === j ? (restant.get(a.id) ?? 0) < 2 : !libre(a.id) || !libre(b.id)) continue;
            const s = casesJustes(
              centre.genome,
              [...donneurs.map((d) => d.genome), a.genome, b.genome],
              cible
            );
            if (s > ms + 1e-12) {
              ms = s;
              ajout = [a, b];
            }
          }
        }
      }
      if (!ajout) break;
      for (const c of ajout) {
        donneurs.push(c);
        restant.set(c.id, (restant.get(c.id) ?? 0) - 1);
      }
      score = ms;
    }

    const dists = resoudrePlant(centre.genome, donneurs.map((d) => d.genome));
    const genomeProbable = genomeLePlusProbable(dists);
    const probabilite = dists.reduce((a, d, i) => a * (d[genomeProbable[i]] ?? 0), 1);

    plans.push({
      centre,
      donneurs,
      genomeProbable,
      probabilite,
      casesAvant: casesJustesDe(centre.genome, cible),
      casesApres: score,
    });
  }

  return plans.sort((a, b) => b.casesApres - a.casesApres);
}



// -----------------------------------------------------------------------------

export function parseGenome(s: string): Genome | null {
  const lettres = s.toUpperCase().replace(/[^GYHWX]/g, "").split("") as GeneLetter[];
  if (lettres.length !== 6) return null;
  return lettres;
}

export function formatGenome(g: Genome): string {
  return g.join("");
}

export const GENOME_VIDE: Genome = ["X", "X", "X", "X", "X", "X"];

/**
 * Ratisse un texte quelconque et en sort toutes les séries de gènes.
 * On ne découpe pas sur les espaces : on cherche directement les suites de six
 * lettres valides, ce qui laisse passer n'importe quel séparateur — virgules,
 * barres obliques, retours à la ligne — ou du texte autour.
 */
export function extraireDepuisTexte(texte: string): Genome[] {
  const out: Genome[] = [];
  const regex = /[GYHWXgyhwx]{6,}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texte)) !== null) {
    const bloc = m[0].toUpperCase();
    for (let i = 0; i + 6 <= bloc.length; i += 6) {
      out.push(bloc.slice(i, i + 6).split("") as Genome);
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// Planification sur plusieurs générations
//
// Une graine sauvage ne devient presque jamais parfaite en un croisement. Le
// vrai travail consiste à enchaîner des générations : fabriquer un pont, le
// bouturer, repartir de cette base, recommencer.
//
// Recherche en faisceau. À chaque génération on teste d'abord si la cible est
// atteignable directement, puis on explore les meilleurs ponts possibles. On
// retient la meilleure route POUR CHAQUE nombre de générations, parce que le
// choix n'est pas évident : une route plus longue mais sûre vaut souvent mieux
// qu'un coup unique risqué, et c'est à la personne de trancher.
//
// Métrique de comparaison : les cycles de pousse attendus, soit la somme des
// 1/p de chaque étape. Une étape à 50 % coûte deux cycles en moyenne, puisqu'on
// la retente jusqu'à ce qu'elle passe.
// -----------------------------------------------------------------------------

export interface EtapeRoute {
  centre: EntreeBanque;
  donneurs: EntreeBanque[];
  /** Ce que produit cette étape : un pont, ou la cible finale. */
  resultat: Genome;
  probabilite: number;
  finale: boolean;
}

export interface Route {
  generations: number;
  etapes: EtapeRoute[];
  /** Cycles de pousse attendus, en comptant les reprises après échec. */
  cyclesAttendus: number;
  /** Probabilité de l'étape la plus risquée. */
  pireEtape: number;
  /** Probabilité de tout réussir du premier coup. */
  probaDuPremierCoup: number;
}

const BOUTURES_PAR_PONT = 3;

export function planifierRoutes(
  banque: EntreeBanque[],
  cible: Genome,
  options: { maxGenerations?: number; faisceau?: number; ponts?: number } = {}
): Route[] {
  const maxGenerations = options.maxGenerations ?? 5;
  const faisceau = options.faisceau ?? 5;
  const nbPonts = options.ponts ?? 5;

  interface Etat {
    banque: EntreeBanque[];
    etapes: EtapeRoute[];
    cycles: number;
    justes: number;
  }

  let faisc: Etat[] = [{ banque, etapes: [], cycles: 0, justes: 0 }];
  const meilleures = new Map<number, Route>();

  for (let gen = 0; gen < maxGenerations; gen++) {
    const suivant: Etat[] = [];

    for (const etat of faisc) {
      // La cible est-elle atteignable dès maintenant ?
      const plan = optimiserBac(etat.banque, cible);
      if (plan && plan.probabilite > 0) {
        const etapes: EtapeRoute[] = [
          ...etat.etapes,
          { centre: plan.centre, donneurs: plan.donneurs, resultat: cible, probabilite: plan.probabilite, finale: true },
        ];
        const cycles = etat.cycles + 1 / plan.probabilite;
        const n = etapes.length;
        const existante = meilleures.get(n);
        if (!existante || cycles < existante.cyclesAttendus) {
          meilleures.set(n, {
            generations: n,
            etapes,
            cyclesAttendus: cycles,
            pireEtape: Math.min(...etapes.map((e) => e.probabilite)),
            probaDuPremierCoup: etapes.reduce((a, e) => a * e.probabilite, 1),
          });
        }
      }

      if (gen === maxGenerations - 1) continue;

      for (const pont of plansProgres(etat.banque, cible).slice(0, nbPonts)) {
        if (pont.probabilite <= 0) continue;
        const code = formatGenome(pont.genomeProbable);
        // Un pont déjà présent en banque ne fait pas avancer.
        if (etat.banque.some((e) => formatGenome(e.genome) === code)) continue;

        suivant.push({
          banque: [
            ...etat.banque,
            { id: `pont-${gen}-${code}`, genome: pont.genomeProbable, quantite: BOUTURES_PAR_PONT },
          ],
          etapes: [
            ...etat.etapes,
            {
              centre: pont.centre,
              donneurs: pont.donneurs,
              resultat: pont.genomeProbable,
              probabilite: pont.probabilite,
              finale: false,
            },
          ],
          cycles: etat.cycles + 1 / pont.probabilite,
          justes: pont.casesApres,
        });
      }
    }

    if (suivant.length === 0) break;
    suivant.sort((a, b) => b.justes - a.justes || a.cycles - b.cycles);
    faisc = suivant.slice(0, faisceau);
  }

  return [...meilleures.values()].sort((a, b) => a.generations - b.generations);
}

/**
 * Pourquoi une cible reste hors de portée.
 *
 * Pour chaque case, on regarde combien de graines de la banque portent le gène
 * visé. En dessous de deux, c'est mathématiquement bloqué : il faut deux
 * donneuses vertes pour déloger un rouge, quelle que soit la patience.
 */
export interface DiagnosticCase {
  index: number;
  geneCible: GeneLetter;
  porteuses: number;
  bloque: boolean;
}

export function diagnostiquerBanque(banque: EntreeBanque[], cible: Genome): DiagnosticCase[] {
  return cible.map((geneCible, i) => {
    const porteuses = banque.reduce((a, e) => a + (e.genome[i] === geneCible ? e.quantite : 0), 0);
    return { index: i, geneCible, porteuses, bloque: porteuses < 2 };
  });
}
