import { GENES, PLANTE_PAR_ID, type GeneLetter } from "@/data/game";

/**
 * Les messages envoyés dans Discord.
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

/**
 * Les champs d'une carte, dans l'ordre où on les lit.
 *
 * D'abord CE QUI EST PLANTÉ et OÙ — c'est ce qu'on cherche quand le message
 * arrive. Puis QUAND agir, l'information qui décide si on repose le téléphone
 * ou si on retourne à la base. L'auteur ne vient qu'après : savoir qui a planté
 * est utile, mais ça n'engage aucune action.
 */
function champsPlant(p: InfosPlant): Champ[] {
  const a = accords(p.plante);
  const champs: Champ[] = [
    { name: "Plante", value: PLANTE_PAR_ID[p.plante]?.nom ?? a.nom, inline: true },
  ];

  if (p.avantCroisement !== undefined && p.avantCroisement > 0) {
    champs.push({ name: "Croisement dans", value: duree(p.avantCroisement), inline: true });
  }
  if (p.avantRecolte !== undefined && p.avantRecolte > 0) {
    champs.push({ name: "Récolte dans", value: duree(p.avantRecolte), inline: true });
  }
  if (p.avantFin !== undefined && p.avantFin > 0) {
    champs.push({ name: "Dépérit dans", value: duree(p.avantFin), inline: true });
  }
  return champs;
}

export function carteCroisement(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const genes = genesColories(p.genes);
  return {
    title: `🧬 ${p.nomBac ?? `${a.maj} ${a.nom}`} — va bouturer`,
    description:
      `Va inspecter le plant en jeu : ses gènes viennent d'être recalculés.\n` +
      `S'ils te plaisent, **bouture-le** — la bouture les copie à l'identique et tu les gardes pour de bon.` +
      (genes ? `\n${genes}` : ""),
    color: COULEURS.croisement,
    fields: champsPlant(p),
    footer: {
      text: p.auteur
        ? `Planté par ${p.auteur} · le bouturage reste possible jusqu'au dépérissement`
        : "Le bouturage reste possible jusqu'au dépérissement",
    },
  };
}

export function carteMur(p: InfosPlant): Carte {
  const a = accords(p.plante);
  return {
    title: `🌾 ${p.nomBac ?? `${a.maj} ${a.nom}`} — récolte prête`,
    description:
      `Rendement maximum atteint. Passe le ramasser : ensuite le plant dépérit et les fruits sont perdus.` +
      (genesColories(p.genes) ?? ""),
    color: COULEURS.mur,
    fields: champsPlant(p),
    footer: {
      text: p.auteur ? `Planté par ${p.auteur}` : "Récolte au rendement maximum",
    },
  };
}

export function carteDeperit(p: InfosPlant): Carte {
  const a = accords(p.plante);
  return {
    title: `⚠️ ${p.nomBac ?? `${a.maj} ${a.nom}`} — le plant meurt`,
    description:
      `La fenêtre de récolte se ferme. Passé ce point il ne reste que de la fibre, ` +
      `et le bac reste occupé tant que tu ne l'as pas vidé.` +
      (genesColories(p.genes) ?? ""),
    color: COULEURS.deperit,
    fields: champsPlant(p),
    footer: {
      text: p.auteur ? `Planté par ${p.auteur}` : "Récolte encore possible, mais dégradée",
    },
  };
}

/**
 * Une plantation.
 *
 * Ici le titre porte CE QUI EST PLANTÉ, pas l'emplacement — l'inverse des
 * autres cartes. Quand une alerte demande d'aller quelque part, savoir où est
 * la première chose utile ; quand elle annonce une plantation, aucune action
 * n'est attendue et c'est le contenu qui intéresse. Un GGGYYY qui part en terre
 * n'a pas le même poids qu'une graine sauvage.
 */
export function cartePlantation(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const nomPlante = PLANTE_PAR_ID[p.plante]?.nom ?? a.nom;
  return {
    title: `🌱 ${nomPlante}${p.genes ? ` ${p.genes}` : ""} — planté`,
    // Pas de phrase de remplissage : le message dit déjà tout par sa seule
    // existence. On ne parle que quand on a quelque chose à ajouter — et une
    // graine sans gène rouge mérite qu'on rappelle les boutures, parce qu'un
    // croisement raté sans copie en caisse fait repartir de zéro.
    description:
      (sansRouge(p.genes)
        ? "Pense à en garder une bouture en caisse avant qu'elle ne se recroise."
        : "") + (genesColories(p.genes) ?? ""),
    color: COULEURS.info,
    fields: champsPlantation(p),
    footer: { text: p.auteur ? `Planté par ${p.auteur}` : "Nouvelle plantation" },
  };
}

/** Les champs d'une plantation : l'emplacement passe devant, la plante étant
 *  déjà dans le titre. */
function champsPlantation(p: InfosPlant): Champ[] {
  const champs: Champ[] = [];
  if (p.nomBac) champs.push({ name: "Emplacement", value: p.nomBac, inline: true });
  if (p.avantCroisement !== undefined && p.avantCroisement > 0) {
    champs.push({ name: "Croisement dans", value: duree(p.avantCroisement), inline: true });
  }
  if (p.avantRecolte !== undefined && p.avantRecolte > 0) {
    champs.push({ name: "Récolte dans", value: duree(p.avantRecolte), inline: true });
  }
  return champs;
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
  return {
    title: "✨ Nouvelle graine sans aucun gène rouge",
    description:
      (genesColories(genes) ?? `\`${genes}\``) +
      `\nPense à en faire des **boutures de secours** avant de la planter : ` +
      `un croisement raté sans copie en caisse, et tu repars de zéro.`,
    color: COULEURS.fete,
    fields: [
      { name: "Plante", value: PLANTE_PAR_ID[planteId]?.nom ?? "—", inline: true },
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
