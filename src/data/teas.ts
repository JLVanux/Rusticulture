import type { BaieId } from "./game";

export type Palier = "basique" | "avance" | "pur";

export const PALIERS: { id: Palier; nom: string; multiple: number }[] = [
  { id: "basique", nom: "Basique", multiple: 1 },
  { id: "avance", nom: "Avancé", multiple: 4 },
  { id: "pur", nom: "Pur", multiple: 16 },
];

export interface The {
  id: string;
  nom: string;
  /** Recette d'un thé Basique : 4 baies au total. L'ordre compte en jeu. */
  recette: BaieId[];
  /** Ce que fait le thé, en une ligne. */
  effet: string;
  /** Valeurs Basique / Avancé / Pur. */
  paliers: [string, string, string];
  dureeMin: number;
  /** Catégorie de buff : les gains de récolte sont amplifiés par la Tarte à l'ours. */
  famille: "recolte" | "combat" | "utilitaire";
  /** Gain numérique (fraction) par palier, quand il est chiffrable. */
  gain?: [number, number, number];
  aVerifier?: string;
}

export const THES: The[] = [
  {
    id: "minerai",
    nom: "Thé de minerai",
    recette: ["jaune", "bleue", "jaune", "bleue"],
    effet: "Plus de minerai par nœud",
    paliers: ["+20 %", "+35 %", "+50 %"],
    gain: [0.2, 0.35, 0.5],
    dureeMin: 30,
    famille: "recolte",
  },
  {
    id: "ferraille",
    nom: "Thé de ferraille",
    recette: ["jaune", "blanche", "jaune", "blanche"],
    effet: "Plus de ferraille — barils uniquement, pas les caisses ni le recycleur",
    paliers: ["+100 %", "+225 %", "+350 %"],
    gain: [1.0, 2.25, 3.5],
    dureeMin: 30,
    famille: "recolte",
  },
  {
    id: "bois",
    nom: "Thé de bois",
    recette: ["rouge", "bleue", "rouge", "bleue"],
    effet: "Plus de bois par arbre",
    paliers: ["+50 %", "+100 %", "+200 %"],
    gain: [0.5, 1.0, 2.0],
    dureeMin: 30,
    famille: "recolte",
  },
  {
    id: "recolte",
    nom: "Thé de récolte",
    recette: ["jaune", "verte", "verte", "verte"],
    effet: "Plus de récolte sur les cultures et les ramassables",
    paliers: ["+35 %", "plus fort", "le plus fort"],
    gain: [0.35, 0.6, 0.9],
    dureeMin: 20,
    famille: "recolte",
    aVerifier: "Recette et valeurs Avancé/Pur non confirmées par une deuxième source.",
  },
  {
    id: "soin",
    nom: "Thé de soin",
    recette: ["rouge", "rouge", "rouge", "rouge"],
    effet: "Rend des PV dans la durée",
    paliers: ["+30 PV", "+50 PV", "+75 PV"],
    dureeMin: 0,
    famille: "combat",
  },
  {
    id: "vie_max",
    nom: "Thé de vie max",
    recette: ["rouge", "rouge", "rouge", "jaune"],
    effet: "Relève le plafond de PV",
    paliers: ["+5 %", "+12 %", "+20 %"],
    gain: [0.05, 0.12, 0.2],
    dureeMin: 20,
    famille: "combat",
  },
  {
    id: "antirad",
    nom: "Thé anti-rad",
    recette: ["rouge", "rouge", "verte", "verte"],
    effet: "Réduit les dégâts de radiation",
    paliers: ["+15 %", "+30 %", "+45 %"],
    gain: [0.15, 0.3, 0.45],
    dureeMin: 30,
    famille: "utilitaire",
  },
  {
    id: "rechauffant",
    nom: "Thé réchauffant",
    recette: ["rouge", "jaune", "rouge", "jaune"],
    effet: "Descend ton seuil de froid — biome neige",
    paliers: ["+5 chaleur", "plus fort", "le plus fort"],
    dureeMin: 20,
    famille: "utilitaire",
    aVerifier: "Deux sources donnent 2 rouge + 2 jaune, une troisième 2 blanche + 2 jaune.",
  },
  {
    id: "rafraichissant",
    nom: "Thé rafraîchissant",
    recette: ["verte", "blanche", "verte", "blanche"],
    effet: "Monte ton seuil de chaleur — désert, jungle",
    paliers: ["+10 fraîcheur", "plus fort", "le plus fort"],
    dureeMin: 20,
    famille: "utilitaire",
    aVerifier: "Deux sources donnent 2 verte + 2 blanche, une troisième 2 blanche + 2 bleue.",
  },
  {
    id: "qualite",
    nom: "Thé de qualité d'artisanat",
    recette: ["verte", "verte", "verte", "blanche"],
    effet: "Chance que les objets fabriqués sortent en meilleure qualité",
    paliers: ["chance", "plus de chance", "le plus de chance"],
    dureeMin: 0,
    famille: "utilitaire",
    aVerifier: "Recette non confirmée par une deuxième source.",
  },
];

export const THE_PAR_ID: Record<string, The> = Object.fromEntries(
  THES.map((t) => [t.id, t])
) as Record<string, The>;

// -----------------------------------------------------------------------------
// Tartes — établi de cuisine
// -----------------------------------------------------------------------------

export interface Tarte {
  id: string;
  nom: string;
  buff: string;
  detail: string;
  dureeMin: number;
  ingredients: { nom: string; qte: number }[];
  /** Multiplicateur appliqué à l'effet des thés de récolte. */
  multiplicateurThe?: number;
  /** Multiplicateur appliqué à la durée des thés. */
  multiplicateurDuree?: number;
  avertissement?: string;
}

export const TARTES: Tarte[] = [
  {
    id: "ours",
    nom: "Tarte à l'ours",
    buff: "Amplifie l'effet des thés de récolte",
    detail:
      "C'est LA tarte pour le minerai. Elle amplifie le gain des thés de récolte (minerai, bois, ferraille) mais coupe leur durée de moitié.",
    dureeMin: 15,
    ingredients: [
      { nom: "Viande d'ours cuite", qte: 2 },
      { nom: "Œuf", qte: 3 },
      { nom: "Blé", qte: 3 },
      { nom: "Pomme de terre", qte: 2 },
      { nom: "Champignon", qte: 2 },
    ],
    multiplicateurThe: 1.5,
    multiplicateurDuree: 0.5,
    avertissement: "Divise la durée du thé par 2. À garder pour une session courte et intense.",
  },
  {
    id: "poulet",
    nom: "Tarte au poulet",
    buff: "Meilleurs gènes à la récolte",
    detail:
      "Augmente la chance d'obtenir de bons gènes sur les cultures. À manger juste avant de récolter ou de cloner une session de croisement.",
    dureeMin: 5,
    ingredients: [
      { nom: "Poulet cuit", qte: 3 },
      { nom: "Maïs", qte: 3 },
      { nom: "Œuf", qte: 3 },
      { nom: "Blé", qte: 3 },
    ],
    avertissement: "Fenêtre de 5 min seulement — mange-la une fois devant le bac.",
  },
  {
    id: "citrouille",
    nom: "Tarte à la citrouille",
    buff: "+10 % PV max",
    detail: "La moins chère des tartes utiles. Ne se cumule pas avec le thé de vie max : seul le plus fort s'applique.",
    dureeMin: 10,
    ingredients: [
      { nom: "Citrouille", qte: 1 },
      { nom: "Œuf", qte: 3 },
      { nom: "Blé", qte: 3 },
    ],
  },
  {
    id: "porc",
    nom: "Tarte au porc",
    buff: "+200 % vitesse de soin",
    detail: "Triple la vitesse de tous les soins progressifs. Avec un gros kit de soin, tu remontes de presque rien à plein en quelques secondes.",
    dureeMin: 15,
    ingredients: [
      { nom: "Porc cuit", qte: 2 },
      { nom: "Œuf", qte: 3 },
      { nom: "Blé", qte: 3 },
      { nom: "Pomme de terre", qte: 2 },
      { nom: "Champignon", qte: 2 },
    ],
  },
  {
    id: "chasseur",
    nom: "Tarte du chasseur",
    buff: "−75 % dégâts de saignement",
    detail: "Le saignement descend beaucoup moins vite, tes soins repassent devant.",
    dureeMin: 15,
    ingredients: [
      { nom: "Viande de cerf cuite", qte: 2 },
      { nom: "Œuf", qte: 3 },
      { nom: "Blé", qte: 3 },
      { nom: "Pomme de terre", qte: 2 },
      { nom: "Champignon", qte: 2 },
    ],
  },
  {
    id: "pomme",
    nom: "Tarte aux pommes",
    buff: "Vision nocturne",
    detail: "Les marques X sur les arbres et les points chauds des nœuds redeviennent visibles de nuit, sans risquer des lunettes NV.",
    dureeMin: 15,
    ingredients: [
      { nom: "Pomme", qte: 2 },
      { nom: "Pot de miel", qte: 1 },
      { nom: "Œuf", qte: 3 },
      { nom: "Blé", qte: 3 },
    ],
    avertissement: "Les pommes ne se trouvent que dans les caisses de nourriture.",
  },
  {
    id: "poisson",
    nom: "Tarte au poisson",
    buff: "+25 % confort",
    detail: "Le confort déclenche la régénération passive quand faim et soif sont hautes. Utile pour se soigner à la base sans consommer de meds.",
    dureeMin: 10,
    ingredients: [
      { nom: "Poisson cuit", qte: 1 },
      { nom: "Œuf", qte: 3 },
      { nom: "Blé", qte: 3 },
      { nom: "Pomme de terre", qte: 2 },
      { nom: "Champignon", qte: 2 },
    ],
    avertissement: "Cher pour ce que ça donne.",
  },
];
