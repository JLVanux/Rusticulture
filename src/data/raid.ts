// Coûts de raid — côté tendre (soft side), patch de juillet 2026.
// Le soufre indiqué est le soufre « déroulé » : celui de la poudre, du
// propergol, des sous-composants, tout compris.

export interface Explosif {
  id: string;
  nom: string;
  soufre: number;
}

export const EXPLOSIFS: Explosif[] = [
  { id: "c4", nom: "C4", soufre: 2200 },
  { id: "roquette", nom: "Roquette", soufre: 1400 },
  { id: "satchel", nom: "Sac d'explosifs", soufre: 480 },
  { id: "beancan", nom: "Grenade artisanale", soufre: 120 },
  { id: "explo556", nom: "Balle explosive 5.56", soufre: 25 },
];

export interface CibleRaid {
  id: string;
  nom: string;
  categorie: "porte" | "mur";
  pv: number;
  /** Nombre de charges nécessaires par explosif. Absent = non viable. */
  couts: Partial<Record<string, number>>;
}

export const CIBLES: CibleRaid[] = [
  { id: "porte_bois", nom: "Porte en bois", categorie: "porte", pv: 200, couts: { c4: 1, roquette: 1, satchel: 2, beancan: 6, explo556: 19 } },
  { id: "porte_tole", nom: "Porte en tôle", categorie: "porte", pv: 250, couts: { c4: 1, roquette: 2, satchel: 4, beancan: 18, explo556: 63 } },
  { id: "porte_garage", nom: "Porte de garage", categorie: "porte", pv: 600, couts: { c4: 2, roquette: 3, satchel: 9 } },
  { id: "porte_blindee", nom: "Porte blindée", categorie: "porte", pv: 1000, couts: { c4: 3, roquette: 5, satchel: 15 } },
  { id: "mur_bois", nom: "Mur en bois", categorie: "mur", pv: 250, couts: { c4: 1, roquette: 2, satchel: 3, beancan: 13 } },
  { id: "mur_pierre", nom: "Mur en pierre", categorie: "mur", pv: 500, couts: { c4: 2, roquette: 4, satchel: 10 } },
  { id: "mur_tole", nom: "Mur en tôle", categorie: "mur", pv: 1000, couts: { c4: 4, roquette: 8, satchel: 23 } },
  { id: "mur_blinde", nom: "Mur blindé (HQM)", categorie: "mur", pv: 2000, couts: { c4: 8, roquette: 15 } },
];

/** Soufre récolté par nœud, sans bonus. Sert à convertir un coût en nœuds. */
export const SOUFRE_PAR_NOEUD = 250;
