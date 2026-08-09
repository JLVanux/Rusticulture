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

function champsPlant(p: InfosPlant): Champ[] {
  const champs: Champ[] = [];
  const a = accords(p.plante);
  champs.push({ name: "Plante", value: PLANTE_PAR_ID[p.plante]?.nom ?? a.nom, inline: true });
  if (p.auteur) champs.push({ name: "Planté par", value: p.auteur, inline: true });
  return champs;
}

export function carteCroisement(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const genes = genesColories(p.genes);
  return {
    title: `🧬 ${p.nomBac ? `${p.nomBac} — le croisement est fait` : `Le croisement est fait sur ${a.poss} ${a.nom}`}`,
    description:
      `Va inspecter le plant en jeu : ses gènes viennent d'être recalculés.\n` +
      `S'ils te plaisent, **bouture-le** — la bouture les copie à l'identique et tu les gardes pour de bon.` +
      (genes ? `\n${genes}` : ""),
    color: COULEURS.croisement,
    fields: champsPlant(p),
    footer: { text: "Le bouturage reste possible jusqu'au dépérissement" },
  };
}

export function carteMur(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const genes = genesColories(p.genes);
  return {
    title: `🌾 ${p.nomBac ? `${p.nomBac} — récolte prête` : `${a.maj} ${a.nom} est ${a.accord} à récolter`}`,
    description:
      `Rendement maximum atteint. Passe le ramasser : ensuite le plant dépérit et les fruits sont perdus.` +
      (genes ? `\n${genes}` : ""),
    color: COULEURS.mur,
    fields: champsPlant(p),
  };
}

export function carteDeperit(p: InfosPlant): Carte {
  const a = accords(p.plante);
  return {
    title: `⚠️ ${p.nomBac ? `${p.nomBac} — le plant meurt` : `${a.maj} ${a.nom} est en train de mourir`}`,
    description:
      `La fenêtre de récolte se ferme. Passé ce point il ne reste que de la fibre — ` +
      `et le bac reste occupé tant que tu ne l'as pas vidé.`,
    color: COULEURS.deperit,
    fields: champsPlant(p),
  };
}

export function cartePlantation(p: InfosPlant): Carte {
  const a = accords(p.plante);
  const genes = genesColories(p.genes);
  return {
    title: `🌱 ${p.auteur ?? "Quelqu'un"} vient de planter`,
    description:
      (p.nomBac ? `**${p.nomBac}** — ` : "") +
      `${PLANTE_PAR_ID[p.plante]?.nom ?? a.nom}. Inutile de replanter par-dessus.` +
      (genes ? `\n${genes}` : ""),
    color: COULEURS.info,
  };
}

export function carteRecolte(auteur: string | null, ressource: string, quantite: number): Carte {
  return {
    title: `📦 ${quantite.toLocaleString("fr-FR")} ${ressource}`,
    description: `${auteur ?? "Quelqu'un"} vient d'enregistrer cette récolte.`,
    color: COULEURS.info,
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

export function cartePointQuotidien(
  jour: number,
  totaux: { ressource: string; total: number }[],
  prochaine: string | null
): Carte {
  return {
    title: `📊 Jour ${jour} du wipe`,
    description:
      totaux.length > 0
        ? totaux
            .map((t) => `**${t.total.toLocaleString("fr-FR")}** ${t.ressource}`)
            .join(" · ")
        : "Aucune récolte enregistrée pour l'instant.",
    color: COULEURS.info,
    fields: prochaine ? [{ name: "Prochaine étape", value: prochaine }] : undefined,
  };
}
