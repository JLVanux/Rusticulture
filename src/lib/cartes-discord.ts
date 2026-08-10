import { GENES, PLANTE_PAR_ID, type GeneLetter, type Genome } from "@/data/game";
import { parseGenome } from "@/lib/crossbreed";
import {
  CONDITIONS_PARFAITES,
  CONSTANTES_DEFAUT,
  calculerCroissance,
  calculerRendement,
} from "@/lib/model";

/**
 * Les messages envoyés dans Discord.
 *
 * Écrits pour une situation précise : quelqu'un est en pleine partie, la
 * notification tombe, il a deux secondes pour trancher une seule question —
 * **est-ce que j'arrête ce que je fais pour rentrer à la base ?**
 *
 * D'où l'ordre de tout ce qui suit :
 *
 * 1. **Qu'est-ce qui se passe**, dans le titre, avec la couleur qui dit
 *    l'urgence avant même la lecture.
 * 2. **Combien ça rapporte** — la seule information qui décide vraiment du
 *    déplacement, et celle qui manquait complètement.
 * 3. **Où**, pour ne pas chercher en arrivant.
 * 4. **Combien de temps il reste**, pour savoir si on peut finir ce qu'on fait.
 *
 * Tout le reste est du bruit et a été retiré.
 *
 * Deux niveaux au-delà du texte brut, tous deux gratuits :
 *
 * 1. **Les cartes** (`embeds`) : un bandeau de couleur à gauche, un titre, des
 *    champs alignés, un pied de page. La couleur fait le travail que le texte
 *    ne peut pas faire — on sait de quoi il s'agit avant d'avoir lu.
 *
 * 2. **Les gènes coloriés.** Discord accepte les codes ANSI dans un bloc de
 *    code : GGGYYY s'affiche avec ses vraies couleurs, les mêmes que sur le
 *    site. C'est le détail qui montre que le message vient d'un outil qui
 *    connaît le jeu, et pas d'un robot générique.
 *
 * Sur les clients qui n'affichent pas l'ANSI, le bloc reste lisible en noir et
 * blanc : on ne perd que la couleur.
 */

/** Codes ANSI de Discord, calés sur les couleurs de gène du site. */
const ANSI: Record<GeneLetter, string> = {
  G: "32", // vert
  Y: "33", // jaune
  H: "36", // cyan
  W: "31", // rouge
  X: "30", // gris
};

export const COULEURS = {
  croisement: 0xce422b, // rouille — une action à faire
  mur: 0x5fd39a, // vert — tout va bien, viens récolter
  deperit: 0xd8a13c, // ambre — ça se perd
  info: 0x6b6358, // gris — journal
  fete: 0xe8683f, // braise — un bon moment
} as const;

/** Une série sans aucun gène rouge : celle qu'on ne veut pas perdre. */
function sansRouge(genes: string | null | undefined): boolean {
  return Boolean(genes) && !genes!.toUpperCase().split("").some((l) => l === "W" || l === "X");
}

/** Le génome en couleurs, dans un bloc ANSI. */
export function genesColories(genes: string | null | undefined): string | null {
  if (!genes) return null;
  const lettres = genes.toUpperCase().split("");
  if (!lettres.every((l) => l in ANSI)) return `\`${genes}\``;

  const colorie = lettres
    .map((l) => `\u001b[1;${ANSI[l as GeneLetter]}m${l}`)
    .join(" ");
  return "```ansi\n" + colorie + "\u001b[0m\n```";
}

export interface Champ {
  name: string;
  value: string;
  inline?: boolean;
}

export interface Carte {
  title: string;
  description?: string;
  color: number;
  fields?: Champ[];
  footer?: { text: string };
  timestamp?: string;
}

/** Enveloppe une carte dans le corps attendu par un webhook. */
export function corpsWebhook(carte: Carte) {
  return {
    username: "RustiCulture",
    embeds: [{ ...carte, timestamp: carte.timestamp ?? new Date().toISOString() }],
  };
}

// -----------------------------------------------------------------------------
// Les cartes
// -----------------------------------------------------------------------------

interface InfosPlant {
  nomBac: string | null;
  plante: string;
  genes: string | null;
  auteur: string | null;
  /** Minutes restantes avant les prochaines échéances, si connues. */
  avantCroisement?: number;
  avantRecolte?: number;
  avantFin?: number;
}

/**
 * Ce qu'un bac plein va rapporter, en ordre de grandeur.
 *
 * C'est l'information qui manquait, et de loin la plus décisive : personne ne
 * traverse la carte sans savoir si ça vaut le trajet. On suppose un grand bac
 * de neuf plants en conditions idéales — la valeur réelle sera plus basse, d'où
 * le « environ » et la mention explicite de l'hypothèse.
 */
function recolteEstimee(planteId: string, genes: string | null): string | null {
  const plante = PLANTE_PAR_ID[planteId];
  const genome: Genome | null = genes ? parseGenome(genes) : null;
  if (!plante || !genome) return null;

  const croissance = calculerCroissance(
    plante.id,
    genome,
    CONDITIONS_PARFAITES,
    CONSTANTES_DEFAUT
  );
  const rendement = calculerRendement(plante.id, genome, CONDITIONS_PARFAITES, CONSTANTES_DEFAUT, {
    plantsParBac: 9,
    bonusTheRecolte: 0,
    minutesCycle: croissance.minutesJusquMur,
  });

  const total = Math.round(rendement.parBac);
  if (!Number.isFinite(total) || total <= 0) return null;
  return `≈ ${total.toLocaleString("fr-FR")} ${plante.ressource}`;
}

/** « 1 h 43 », « 26 min ». */
export function duree(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const reste = m % 60;
  return reste === 0 ? `${h} h` : `${h} h ${String(reste).padStart(2, "0")}`;
}

function accords(planteId: string) {
  const infos = PLANTE_PAR_ID[planteId];
  const feminin = infos?.genre === "f";
  return {
    nom: (infos?.nom ?? "plant").toLowerCase(),
    poss: feminin ? "ta" : "ton",
    accord: feminin ? "prête" : "prêt",
    maj: feminin ? "Ta" : "Ton",
  };
}


export function carteCroisement(p: InfosPlant): Carte {
  const a = accords(p.plante);
  return {
    title: `🧬 ${p.nomBac ?? `${a.maj} ${a.nom}`} — les gènes sont tombés`,
    // Le site ne connaît PAS le résultat du croisement : il faut aller le lire
    // en jeu. Le dire clairement évite de laisser croire à une information
    // qu'on n'a pas.
    description:
      `Inspecte le plant pour découvrir ce qu'il est devenu. ` +
      `S'il te plaît, **bouture-le** — la bouture fige ses gènes.` +
      (genesColories(p.genes) ?? ""),
    color: COULEURS.croisement,
    fields: [
      { name: "Gènes plantés", value: p.genes ?? "—", inline: true },
      ...(p.nomBac ? [{ name: "Où", value: p.nomBac, inline: true }] : []),
      ...(p.avantFin !== undefined && p.avantFin > 0
        ? [{ name: "Tu as jusqu'à", value: duree(p.avantFin), inline: true }]
        : []),
    ],
    footer: {
      text: p.auteur ? `Planté par ${p.auteur}` : "Le bouturage reste possible jusqu'au dépérissement",
    },
  };
}

export function carteMur(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const recolte = recolteEstimee(p.plante, p.genes);
  return {
    title: `🌾 ${p.nomBac ?? `${a.maj} ${a.nom}`} — à récolter`,
    description: recolte
      ? `Un grand bac plein rapporterait **${recolte}** en conditions idéales.`
      : `Rendement maximum atteint.`,
    color: COULEURS.mur,
    fields: [
      ...(recolte ? [{ name: "Récolte estimée", value: recolte, inline: true }] : []),
      ...(p.nomBac ? [{ name: "Où", value: p.nomBac, inline: true }] : []),
      ...(p.avantFin !== undefined && p.avantFin > 0
        ? [{ name: "Avant que ça se perde", value: duree(p.avantFin), inline: true }]
        : []),
    ],
    footer: { text: p.auteur ? `Planté par ${p.auteur}` : "Estimation, pas une mesure" },
  };
}

export function carteDeperit(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const recolte = recolteEstimee(p.plante, p.genes);
  return {
    title: `⚠️ ${p.nomBac ?? `${a.maj} ${a.nom}`} — dernière chance`,
    description: recolte
      ? `Le plant dépérit : tu perds **${recolte}** si personne n'y va. ` +
        `Passé ce point il ne reste que de la fibre.`
      : `Le plant dépérit. Passé ce point il ne reste que de la fibre.`,
    color: COULEURS.deperit,
    fields: [
      ...(recolte ? [{ name: "En jeu", value: recolte, inline: true }] : []),
      ...(p.nomBac ? [{ name: "Où", value: p.nomBac, inline: true }] : []),
    ],
    footer: { text: "Le bac reste occupé tant qu'il n'est pas vidé" },
  };
}

export function cartePlantation(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const nomPlante = PLANTE_PAR_ID[p.plante]?.nom ?? a.nom;
  return {
    // Ici le contenu passe devant le lieu : aucune action n'est attendue, c'est
    // ce qui vient d'être mis en terre qui intéresse l'équipe.
    title: `🌱 ${nomPlante}${p.genes ? ` ${p.genes}` : ""} — planté`,
    description:
      (sansRouge(p.genes)
        ? "Aucun gène rouge : garde une bouture en caisse avant qu'elle ne se recroise."
        : "") + (genesColories(p.genes) ?? ""),
    color: COULEURS.info,
    fields: [
      ...(p.nomBac ? [{ name: "Où", value: p.nomBac, inline: true }] : []),
      ...(p.avantCroisement !== undefined && p.avantCroisement > 0
        ? [{ name: "Gènes recalculés dans", value: duree(p.avantCroisement), inline: true }]
        : []),
      ...(p.avantRecolte !== undefined && p.avantRecolte > 0
        ? [{ name: "Récolte dans", value: duree(p.avantRecolte), inline: true }]
        : []),
    ],
    footer: { text: p.auteur ? `Planté par ${p.auteur}` : "Nouvelle plantation" },
  };
}

export function carteRecolte(auteur: string | null, ressource: string, quantite: number): Carte {
  return {
    title: `📦 Récolte enregistrée`,
    description: "Elle entre dans les statistiques du wipe.",
    color: COULEURS.info,
    fields: [
      { name: "Ressource", value: ressource, inline: true },
      { name: "Quantité", value: quantite.toLocaleString("fr-FR"), inline: true },
    ],
    footer: { text: auteur ? `Enregistrée par ${auteur}` : "Récolte enregistrée" },
  };
}

export function carteGraineParfaite(genes: string, planteId: string, auteur: string | null): Carte {
  const nom = PLANTE_PAR_ID[planteId]?.nom ?? "plant";
  const recolte = recolteEstimee(planteId, genes);
  return {
    title: `✨ ${nom} ${genes} — aucun gène rouge`,
    description:
      `Mets-en une bouture en caisse **avant** de la planter : un croisement raté ` +
      `sans copie de secours, et tu repars de zéro.` + (genesColories(genes) ?? ""),
    color: COULEURS.fete,
    fields: [
      ...(recolte ? [{ name: "Vaut par bac", value: recolte, inline: true }] : []),
      ...(auteur ? [{ name: "Obtenue par", value: auteur, inline: true }] : []),
    ],
  };
}

export function carteMembreArrive(pseudo: string, nomFerme: string): Carte {
  return {
    title: `👋 ${pseudo} rejoint la ferme`,
    description:
      `Il voit désormais les mêmes graines, les mêmes minuteurs et les mêmes chiffres que vous.`,
    color: COULEURS.fete,
    fields: [{ name: "Ferme", value: nomFerme, inline: true }],
    footer: { text: "Le rôle se règle depuis la page Équipe" },
  };
}

export function carteMembreParti(pseudo: string, nomFerme: string, exclu: boolean): Carte {
  return {
    title: exclu ? `🚪 ${pseudo} a été retiré de la ferme` : `🚪 ${pseudo} a quitté la ferme`,
    description:
      `Ce qu'il a ajouté reste : les graines, les bacs et les récoltes appartiennent à la ferme, ` +
      `pas à la personne.`,
    color: COULEURS.info,
    fields: [{ name: "Ferme", value: nomFerme, inline: true }],
  };
}

export function cartePointQuotidien(b: {
  jour: number;
  nom: string;
  totaux: { ressource: string; total: number }[];
  graines: number;
  enCours: number;
}): Carte {
  return {
    title: `📊 Jour ${b.jour} — ${b.nom}`,
    description:
      b.totaux.length > 0
        ? "Récolté depuis le début du wipe :"
        : "Aucune récolte enregistrée pour l'instant.",
    color: COULEURS.info,
    fields: [
      ...b.totaux.map((t) => ({
        name: t.ressource,
        value: t.total.toLocaleString("fr-FR"),
        inline: true,
      })),
      { name: "Graines en réserve", value: String(b.graines), inline: true },
      {
        name: "Minuteurs en cours",
        value: String(b.enCours),
        inline: true,
      },
    ],
  };
}
