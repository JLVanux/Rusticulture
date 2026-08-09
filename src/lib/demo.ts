import { GENES, type GeneLetter, type Genome } from "@/data/game";
import { parseGenome, probabiliteCible, resoudrePlant } from "@/lib/crossbreed";

/**
 * Le cas montré sur l'accueil.
 *
 * Une graine entièrement sauvage — six gènes rouges, la pire possible — placée
 * au centre de huit donneuses ordinaires de deuxième génération. Résultat :
 * GGGYYY garanti. C'est le scénario le plus parlant, et il est vrai.
 *
 * Les chiffres ne sont pas écrits à la main : ils sortent du moteur du site.
 * Si le modèle changeait, la démonstration changerait avec lui — elle ne peut
 * donc pas devenir un mensonge sans que l'outil le devienne aussi.
 */

const CIBLE = parseGenome("GGGYYY")!;
const DEPART = parseGenome("WXHWXH")!;

const DONNEUSES = [
  "GGGYYW",
  "GGXYYY",
  "WGGYYY",
  "GXGYYY",
  "GGGWYY",
  "GGGYXY",
  "XGGYYW",
  "GGWYYY",
].map((code) => parseGenome(code)!);

export interface CaseDemo {
  lettre: GeneLetter;
  couleur: string;
  depart: GeneLetter;
  couleurDepart: string;
  probabilite: number;
  /** Poids cumulé des donneuses qui portent le gène visé, sur cette case. */
  poidsPour: number;
  /** Poids du gène en place, à dépasser strictement. */
  poidsCentre: number;
}

export interface Demo {
  cible: Genome;
  depart: Genome;
  donneuses: Genome[];
  probabilite: number;
  cases: CaseDemo[];
}

export function calculerDemo(): Demo {
  const distributions = resoudrePlant(DEPART, DONNEUSES);

  const cases: CaseDemo[] = CIBLE.map((lettre, i) => ({
    lettre,
    couleur: GENES[lettre].couleur,
    depart: DEPART[i],
    couleurDepart: GENES[DEPART[i]].couleur,
    probabilite: distributions[i][lettre] ?? 0,
    poidsPour:
      Math.round(
        DONNEUSES.reduce((t, v) => t + (v[i] === lettre ? GENES[v[i]].poids : 0), 0) * 10
      ) / 10,
    poidsCentre: GENES[DEPART[i]].poids,
  }));

  return {
    cible: CIBLE,
    depart: DEPART,
    donneuses: DONNEUSES,
    probabilite: probabiliteCible(DEPART, DONNEUSES, CIBLE),
    cases,
  };
}
