import { PLANTE_PAR_ID, STADES, type Genome, type PlanteId } from "@/data/game";
import { PALIERS, THE_PAR_ID, type Palier } from "@/data/teas";
import type { BaieId } from "@/data/game";

// -----------------------------------------------------------------------------
// Constantes du modèle — TOUTES ajustables depuis la page Réglages.
//
// Rust ne publie pas ses formules, et les valeurs communautaires divergent d'un
// site à l'autre. Ces constantes sont calées sur les repères les plus souvent
// cités (chanvre graine brute ≈ 5 h, chanvre GGGYYY ≈ 1 h 35). Mesure tes
// propres cycles en jeu et corrige-les : le reste du site suit automatiquement.
// -----------------------------------------------------------------------------

export interface Constantes {
  /**
   * Réduction du temps de pousse par gène G, en fraction.
   * 0,17 → chaque G retire 17 % au temps restant (effet géométrique, donc
   * dégressif : 3G retirent environ 43 %, pas 51 %).
   */
  facteurG: number;
  /** Gain de récolte par gène Y, en fraction du rendement de base. */
  facteurY: number;
  /** Ce que la robustesse rattrape sur de mauvaises conditions, par gène H. */
  facteurH: number;
  /** Ce que coûte un gène W en consommation d'eau. Informatif. */
  facteurW: number;
  /** Multiplicateur de taux du serveur (2× = pousse deux fois plus vite). */
  tauxServeur: number;
}

export const CONSTANTES_DEFAUT: Constantes = {
  facteurG: 0.17,
  facteurY: 0.27,
  facteurH: 0.15,
  facteurW: 0.2,
  tauxServeur: 1,
};

export interface Conditions {
  /** 0 à 1 chacun. */
  eau: number;
  lumiere: number;
  temperature: number;
  /** Bacs : le grand bac accueille 9 plants, le petit 1. */
  engrais: boolean;
}

export const CONDITIONS_PARFAITES: Conditions = { eau: 1, lumiere: 1, temperature: 1, engrais: false };

function compter(g: Genome, lettre: string) {
  return g.filter((l) => l === lettre).length;
}

/** Qualité globale des conditions, 0 à 1, adoucie par les gènes H. */
export function qualiteConditions(c: Conditions, genome: Genome, k: Constantes): number {
  const brut = (c.eau + c.lumiere + c.temperature) / 3;
  const h = compter(genome, "H");
  const rattrapage = Math.min(1, h * k.facteurH);
  return Math.min(1, brut + (1 - brut) * rattrapage);
}

// -----------------------------------------------------------------------------
// Temps de pousse
// -----------------------------------------------------------------------------

export interface Croissance {
  /** Temps pour atteindre le stade Mûr, c'est-à-dire la récolte. */
  minutesJusquMur: number;
  /** Durée de la fenêtre de récolte, avant que le plant ne dépérisse. */
  minutesFenetreMur: number;
  /** Moment où les gènes sont recalculés — démarrage du stade Croisement. */
  minutesAvantCroisement: number;
  /** Moment où le plant commence à dépérir. */
  minutesAvantDeclin: number;
  minutesParStade: {
    id: string;
    nom: string;
    note: string;
    apres: boolean;
    minutes: number;
    /** Instant auquel ce stade commence. */
    debut: number;
  }[];
}

export function calculerCroissance(
  planteId: PlanteId,
  genome: Genome,
  conditions: Conditions,
  k: Constantes
): Croissance {
  const plante = PLANTE_PAR_ID[planteId];
  const g = compter(genome, "G");
  const q = qualiteConditions(conditions, genome, k);

  // De mauvaises conditions rallongent le cycle, sans jamais le doubler au-delà.
  const penalite = 0.5 + 0.5 * q; // q=1 → 1 ; q=0 → 0,5

  // Effet des gènes G : géométrique, donc dégressif. Chaque G retire une part du
  // temps RESTANT, pas du temps de base. C'est la forme qui colle aux courbes
  // publiées par la communauté (environ −17 % à 1G, −43 % à 3G, −64 % à 6G),
  // là où une formule linéaire surestimait largement l'effet.
  const reduction = Math.pow(1 - Math.min(0.9, k.facteurG), g);
  const jusquMur = (plante.minutesBase * reduction) / (penalite * k.tauxServeur);

  let curseur = 0;
  const minutesParStade = STADES.map((st) => {
    const minutes = jusquMur * st.part;
    const entree = { id: st.id, nom: st.nom, note: st.note, apres: st.apres, minutes, debut: curseur };
    curseur += minutes;
    return entree;
  });

  const croisement = minutesParStade.find((st) => st.id === "croisement");
  const mur = minutesParStade.find((st) => st.id === "mur");
  const mourant = minutesParStade.find((st) => st.id === "mourant");

  return {
    minutesJusquMur: jusquMur,
    minutesFenetreMur: mur?.minutes ?? 0,
    minutesAvantCroisement: croisement?.debut ?? 0,
    minutesAvantDeclin: mourant?.debut ?? jusquMur,
    minutesParStade,
  };
}

// -----------------------------------------------------------------------------
// Rendement
// -----------------------------------------------------------------------------

export interface Rendement {
  parPlant: number;
  parBac: number;
  parHeure: number;
  boutures: number;
}

export function calculerRendement(
  planteId: PlanteId,
  genome: Genome,
  conditions: Conditions,
  k: Constantes,
  options: { plantsParBac: number; bonusTheRecolte: number; minutesCycle: number }
): Rendement {
  const plante = PLANTE_PAR_ID[planteId];
  const y = compter(genome, "Y");
  const q = qualiteConditions(conditions, genome, k);

  const parPlant =
    plante.rendementBase *
    (1 + k.facteurY * y) *
    (0.5 + 0.5 * q) *
    (1 + options.bonusTheRecolte) *
    (conditions.engrais ? 1.1 : 1);

  const parBac = parPlant * options.plantsParBac;
  const parHeure = options.minutesCycle > 0 ? (parBac * 60) / options.minutesCycle : 0;

  return { parPlant, parBac, parHeure, boutures: plante.boutures };
}

// -----------------------------------------------------------------------------
// Thés — calcul à l'envers : d'une commande de thés vers les baies, les plants
// et le temps
// -----------------------------------------------------------------------------

export interface LigneCommande {
  theId: string;
  palier: Palier;
  quantite: number;
}

export interface BesoinThe {
  /** Nombre de thés basiques à infuser au total. */
  thesBasiques: number;
  /** Baies par couleur. */
  baies: Record<BaieId, number>;
  /** Détail par ligne de commande. */
  lignes: {
    theId: string;
    nom: string;
    palier: Palier;
    quantite: number;
    thesBasiques: number;
    baies: Record<string, number>;
  }[];
}

const BAIES_VIDES = (): Record<BaieId, number> => ({ rouge: 0, jaune: 0, bleue: 0, verte: 0, blanche: 0 });

export function calculerBesoinThes(commande: LigneCommande[]): BesoinThe {
  const total = BAIES_VIDES();
  let thesBasiques = 0;
  const lignes: BesoinThe["lignes"] = [];

  for (const ligne of commande) {
    const the = THE_PAR_ID[ligne.theId];
    if (!the || ligne.quantite <= 0) continue;
    const mult = PALIERS.find((p) => p.id === ligne.palier)?.multiple ?? 1;
    const nbBasiques = ligne.quantite * mult;
    thesBasiques += nbBasiques;

    const baiesLigne: Record<string, number> = {};
    for (const baie of the.recette) {
      total[baie] += nbBasiques;
      baiesLigne[baie] = (baiesLigne[baie] ?? 0) + nbBasiques;
    }

    lignes.push({
      theId: the.id,
      nom: the.nom,
      palier: ligne.palier,
      quantite: ligne.quantite,
      thesBasiques: nbBasiques,
      baies: baiesLigne,
    });
  }

  return { thesBasiques, baies: total, lignes };
}

/** Combien de thés une réserve de baies permet-elle d'infuser ? */
export function thesPossibles(theId: string, palier: Palier, stock: Record<BaieId, number>): number {
  const the = THE_PAR_ID[theId];
  if (!the) return 0;
  const mult = PALIERS.find((p) => p.id === palier)?.multiple ?? 1;

  const parBasique: Record<string, number> = {};
  for (const b of the.recette) parBasique[b] = (parBasique[b] ?? 0) + 1;

  let max = Infinity;
  for (const [baie, qte] of Object.entries(parBasique)) {
    max = Math.min(max, Math.floor((stock[baie as BaieId] ?? 0) / qte));
  }
  if (!isFinite(max)) return 0;
  return Math.floor(max / mult);
}

// -----------------------------------------------------------------------------
// Formatage
// -----------------------------------------------------------------------------

export function formatDuree(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

export function formatNombre(n: number, decimales = 1): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: decimales });
}
