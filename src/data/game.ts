// -----------------------------------------------------------------------------
// Données de jeu Rust — agriculture
// Sources : frozen-rust.com (cheat sheet, MAJ 03/07/2026), rust-survival.com,
// rustgenes.gg, wiki Facepunch.
// Tout ce qui est marqué `aVerifier: true` diverge entre les sources : à
// confirmer en jeu avant de considérer la valeur comme fiable.
// -----------------------------------------------------------------------------

export type GeneLetter = "G" | "Y" | "H" | "W" | "X";
export type Genome = GeneLetter[]; // toujours 6 cases

export const GENE_LETTERS: GeneLetter[] = ["G", "Y", "H", "W", "X"];

export const GENES: Record<
  GeneLetter,
  { nom: string; effet: string; poids: number; bon: boolean; couleur: string }
> = {
  G: { nom: "Croissance", effet: "Pousse plus vite", poids: 0.6, bon: true, couleur: "#5fd39a" },
  Y: { nom: "Rendement", effet: "Plus de récolte", poids: 0.6, bon: true, couleur: "#f2cf5b" },
  H: { nom: "Robustesse", effet: "Encaisse les mauvaises conditions", poids: 0.6, bon: true, couleur: "#6fbfe0" },
  W: { nom: "Eau", effet: "Boit plus — et gagne les égalités", poids: 1.0, bon: false, couleur: "#e8735f" },
  X: { nom: "Vide", effet: "Aucun effet — et gagne les égalités", poids: 1.0, bon: false, couleur: "#8a9299" },
};

/** Combinaisons de référence, avec la raison de les viser. */
export const GENOMES_CIBLES: { code: string; libelle: string; pour: string }[] = [
  { code: "GGGYYY", libelle: "God clone", pour: "Le compromis de référence : pousse vite ET rend bien." },
  { code: "YYYYYY", libelle: "Rendement max", pour: "Le plus de récolte par plant, mais cycles très lents." },
  { code: "GGYYYY", libelle: "Rendement +", pour: "Un cran de rendement en plus, un cran de vitesse en moins." },
  { code: "GGGGYY", libelle: "Vitesse +", pour: "Cycles courts : pour cloner souvent ou farmer en présence." },
  { code: "GGGGGG", libelle: "Vitesse max", pour: "Cycles les plus courts. Rendement médiocre." },
  { code: "GGGYYH", libelle: "Biome neige", pour: "Un H pour encaisser la température quand il manque un chauffage." },
];

// -----------------------------------------------------------------------------
// Plantes
// -----------------------------------------------------------------------------

export type PlanteId =
  | "chanvre"
  | "baie_rouge"
  | "baie_jaune"
  | "baie_bleue"
  | "baie_verte"
  | "baie_blanche"
  | "citrouille"
  | "mais"
  | "pomme_de_terre"
  | "ble";

export interface Plante {
  id: PlanteId;
  nom: string;
  categorie: "fibre" | "baie" | "nourriture";
  /** Récolte : nom de la ressource sortie. */
  ressource: string;
  /** Minutes jusqu'au stade Mûr pour une graine sans gène G, en conditions parfaites. */
  minutesBase: number;
  /** Récolte pour un plant sans gène Y, en conditions parfaites. */
  rendementBase: number;
  /** Boutures obtenues en clonant un plant. */
  boutures: number;
  couleur: string;
}

export const PLANTES: Plante[] = [
  { id: "chanvre", nom: "Chanvre", categorie: "fibre", ressource: "tissu", minutesBase: 180, rendementBase: 10, boutures: 3, couleur: "#7fae6a" },
  { id: "baie_rouge", nom: "Baie rouge", categorie: "baie", ressource: "baies", minutesBase: 180, rendementBase: 4, boutures: 3, couleur: "#d9534f" },
  { id: "baie_jaune", nom: "Baie jaune", categorie: "baie", ressource: "baies", minutesBase: 180, rendementBase: 4, boutures: 3, couleur: "#e6b83c" },
  { id: "baie_bleue", nom: "Baie bleue", categorie: "baie", ressource: "baies", minutesBase: 180, rendementBase: 4, boutures: 3, couleur: "#4f83d9" },
  { id: "baie_verte", nom: "Baie verte", categorie: "baie", ressource: "baies", minutesBase: 180, rendementBase: 4, boutures: 3, couleur: "#5aa860" },
  { id: "baie_blanche", nom: "Baie blanche", categorie: "baie", ressource: "baies", minutesBase: 180, rendementBase: 4, boutures: 3, couleur: "#d8dee2" },
  { id: "citrouille", nom: "Citrouille", categorie: "nourriture", ressource: "citrouilles", minutesBase: 220, rendementBase: 3, boutures: 2, couleur: "#e08a2e" },
  { id: "mais", nom: "Maïs", categorie: "nourriture", ressource: "maïs", minutesBase: 220, rendementBase: 3, boutures: 2, couleur: "#e8c65a" },
  { id: "pomme_de_terre", nom: "Pomme de terre", categorie: "nourriture", ressource: "pommes de terre", minutesBase: 180, rendementBase: 3, boutures: 2, couleur: "#b99764" },
  { id: "ble", nom: "Blé", categorie: "nourriture", ressource: "blé", minutesBase: 180, rendementBase: 4, boutures: 2, couleur: "#d9bd77" },
];

export const PLANTE_PAR_ID: Record<string, Plante> = Object.fromEntries(
  PLANTES.map((p) => [p.id, p])
) as Record<string, Plante>;

/**
 * Stades de vie.
 *
 * Les sept noms sont confirmés par une demi-douzaine de sources concordantes :
 * Plantule, Jeune pousse, Croisement, Mature, Fructification, Mûr, Mourant.
 *
 * `part` est la fraction du temps nécessaire pour ATTEINDRE le stade Mûr. Les
 * cinq premiers stades totalisent donc 1,0 ; Mûr et Mourant viennent après et
 * sont des fenêtres, pas des étapes de croissance.
 *
 * Ancrage : une mesure publiée donne Jeune pousse finissant à 31 min, Croisement
 * long de 2 min, Mature long de 42 min et finissant à 1 h 15. Rapporté à un
 * cycle d'environ 2 h, le Croisement démarre donc autour de 27 % du parcours,
 * ce que reproduisent les proportions ci-dessous. Le reste reste une estimation.
 */
export const STADES = [
  {
    id: "plantule",
    nom: "Plantule",
    part: 0.15,
    apres: false,
    note: "Rien à faire. Surveille l'eau.",
  },
  {
    id: "pousse",
    nom: "Jeune pousse",
    part: 0.12,
    apres: false,
    note: "Le bouturage devient possible à partir d'ici.",
  },
  {
    id: "croisement",
    nom: "Croisement",
    part: 0.02,
    apres: false,
    note: "Très court — environ deux minutes. Les gènes sont recalculés à son démarrage : c'est le premier moment où tu peux lire le résultat du croisement.",
  },
  {
    id: "mature",
    nom: "Mature",
    part: 0.36,
    apres: false,
    note: "Le rendement commence à monter. Le chanvre est déjà récoltable, mais tu perdrais la moitié de la récolte.",
  },
  {
    id: "fructification",
    nom: "Fructification",
    part: 0.35,
    apres: false,
    note: "Les fruits se forment. Les cultures alimentaires deviennent récoltables ici.",
  },
  {
    id: "mur",
    nom: "Mûr",
    part: 0.25,
    apres: true,
    note: "Rendement maximum. C'est le moment de récolter, et la fenêtre ne dure pas éternellement.",
  },
  {
    id: "mourant",
    nom: "Mourant",
    part: 0.2,
    apres: true,
    note: "Le plant dépérit. Les fruits sont perdus, il ne reste que de la fibre.",
  },
];

// -----------------------------------------------------------------------------
// Baies
// -----------------------------------------------------------------------------

export type BaieId = "rouge" | "jaune" | "bleue" | "verte" | "blanche";

export const BAIES: { id: BaieId; nom: string; couleur: string; plante: PlanteId }[] = [
  { id: "rouge", nom: "Rouge", couleur: "#d9534f", plante: "baie_rouge" },
  { id: "jaune", nom: "Jaune", couleur: "#e6b83c", plante: "baie_jaune" },
  { id: "bleue", nom: "Bleue", couleur: "#4f83d9", plante: "baie_bleue" },
  { id: "verte", nom: "Verte", couleur: "#5aa860", plante: "baie_verte" },
  { id: "blanche", nom: "Blanche", couleur: "#d8dee2", plante: "baie_blanche" },
];
