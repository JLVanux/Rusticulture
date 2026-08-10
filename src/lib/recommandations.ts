"use client";

import { PLANTE_PAR_ID, type Genome, type PlanteId } from "@/data/game";
import { formatGenome, GENOME_VIDE } from "@/lib/crossbreed";
import type { GraineUnifiee } from "@/lib/graines";
import { calculerCroissance, calculerRendement, formatDuree, formatNombre, type Conditions, type Constantes } from "@/lib/model";
import { calculerProgression, type Objectif } from "@/lib/objectifs";
import { CONTENANT_PAR_ID, type LigneProduction, type Plantation } from "@/lib/plantations";
import type { Recolte } from "@/lib/recoltes";
import type { TimerUnifie } from "@/lib/timers";
import type { Elevage } from "@/lib/elevage";

// -----------------------------------------------------------------------------
// Recommandations
//
// Chaque règle part d'un fait enregistré et dit lequel. Aucune ne devine, aucune
// ne s'appuie sur une moyenne inventée : si la donnée manque, la règle ne se
// déclenche pas plutôt que de produire un conseil creux.
//
// L'urgence classe les propositions. Le principe : ce qui se referme passe
// devant ce qui attend. Une fenêtre de bouturage manquée ne se rattrape pas ;
// une graine à remplacer attendra demain.
// -----------------------------------------------------------------------------

export interface Recommandation {
  id: string;
  titre: string;
  detail: string;
  /** Le fait qui déclenche la règle. Toujours affiché : sans lui, c'est un oracle. */
  pourquoi: string;
  lien?: { href: string; label: string };
  urgence: number;
  ton: "action" | "amelioration" | "alerte";
}

export interface ContexteFerme {
  plantations: Plantation[];
  graines: GraineUnifiee[];
  timers: TimerUnifie[];
  recoltes: Recolte[];
  objectifs: Objectif[];
  production: LigneProduction[];
  conditions: Conditions;
  constantes: Constantes;
  debutWipe: number | null;
  /**
   * Présent pour les règles à venir. Pas de recommandation sur la saturation des
   * poulaillers : elle survient au bout d'une dizaine de minutes par
   * construction, donc la règle se déclencherait à chaque visite. Un conseil qui
   * s'affiche toujours cesse d'être lu, et décrédibilise les autres.
   * L'information reste sur le tableau de bord, où elle est utile sans être
   * répétée comme une alerte.
   */
  elevage: Elevage;
}

const URGENCE = {
  fenetreQuiSeFerme: 100,
  recolteAttend: 80,
  perteEnCours: 90,
  configurationManquante: 70,
  ameliorationChiffree: 50,
  objectifProche: 40,
  reglage: 30,
  conseil: 10,
};

export function calculerRecommandations(c: ContexteFerme): Recommandation[] {
  const out: Recommandation[] = [];
  const maintenant = Date.now();

  // --- Ce qui se referme ------------------------------------------------------

  const aBouturer = c.timers.filter((t) => {
    const ecoule = (maintenant - t.debut) / 60000;
    return ecoule >= t.minutesCroisement && ecoule < t.minutesMur;
  });

  if (aBouturer.length > 0) {
    out.push({
      id: "bouturage",
      titre:
        aBouturer.length === 1
          ? "Va inspecter ton plant"
          : `Va inspecter ${aBouturer.length} plants`,
      detail:
        "Leurs gènes viennent d'être recalculés. C'est le premier moment où tu peux lire le résultat du croisement, et le bouturer si le résultat te plaît.",
      pourquoi: `${aBouturer.map((t) => t.nom).join(", ")} — passé${aBouturer.length > 1 ? "s" : ""} en stade Croisement.`,
      lien: { href: "/minuteurs", label: "Voir les minuteurs" },
      urgence: URGENCE.fenetreQuiSeFerme,
      ton: "action",
    });
  }

  const mourants = c.timers.filter((t) => (maintenant - t.debut) / 60000 >= t.minutesFin);
  if (mourants.length > 0) {
    out.push({
      id: "mourants",
      titre: `${mourants.length} plant${mourants.length > 1 ? "s" : ""} en train de dépérir`,
      detail:
        "Passé le stade Mûr, les fruits sont perdus et il ne reste que de la fibre. Récolte ce qui peut l'être et replante.",
      pourquoi: `${mourants.map((t) => t.nom).join(", ")} — au-delà de la fenêtre de récolte.`,
      lien: { href: "/minuteurs", label: "Voir les minuteurs" },
      urgence: URGENCE.perteEnCours,
      ton: "alerte",
    });
  }

  const murs = c.timers.filter((t) => {
    const ecoule = (maintenant - t.debut) / 60000;
    return ecoule >= t.minutesMur && ecoule < t.minutesFin;
  });
  if (murs.length > 0) {
    const plusUrgent = murs.reduce((a, t) =>
      t.debut + t.minutesFin * 60000 < a.debut + a.minutesFin * 60000 ? t : a
    );
    const resteMin = (plusUrgent.debut + plusUrgent.minutesFin * 60000 - maintenant) / 60000;
    out.push({
      id: "recolte",
      titre: `${murs.length} récolte${murs.length > 1 ? "s" : ""} prête${murs.length > 1 ? "s" : ""}`,
      detail: `Rendement maximum atteint. La fenêtre la plus courte se ferme dans ${formatDuree(resteMin)}.`,
      pourquoi: `${murs.map((t) => t.nom).join(", ")} — au stade Mûr.`,
      lien: { href: "/minuteurs", label: "Voir les minuteurs" },
      urgence: URGENCE.recolteAttend,
      ton: "action",
    });
  }

  // --- Configuration manquante ------------------------------------------------

  if (c.plantations.length === 0) {
    out.push({
      id: "declarer-bacs",
      titre: "Déclare tes bacs",
      detail:
        "Sans configuration, le site ne peut rien estimer : ni ta production, ni la cohérence de tes récoltes, ni ce qu'il faudrait améliorer.",
      pourquoi: "Aucune plantation déclarée sur ce wipe.",
      lien: { href: "/ferme", label: "Configurer" },
      urgence: URGENCE.configurationManquante,
      ton: "alerte",
    });
  }

  if (c.graines.length === 0) {
    out.push({
      id: "ajouter-graines",
      titre: "Ajoute tes graines",
      detail:
        "Tant que ta banque est vide, aucun plan de croisement n'est calculable et rien ne peut te dire quelle graine planter.",
      pourquoi: "Aucune graine en réserve.",
      lien: { href: "/scanner", label: "Scanner l'écran" },
      urgence: URGENCE.configurationManquante,
      ton: "alerte",
    });
  }

  // --- La meilleure amélioration chiffrée -------------------------------------

  const remplacement = meilleurRemplacement(c);
  if (remplacement) out.push(remplacement);

  // --- Objectifs à portée -----------------------------------------------------

  const contexteObjectifs = {
    recoltes: c.recoltes,
    graines: c.graines,
    plantations: c.plantations,
  };
  for (const o of c.objectifs) {
    const p = calculerProgression(o, contexteObjectifs);
    if (p.atteint || p.part < 0.8) continue;
    out.push({
      id: `objectif-${o.id}`,
      titre: `« ${o.libelle} » est à portée`,
      detail: `Tu en es à ${Math.round(p.part * 100)} %. ${
        o.type === "production" ? "Une ou deux récoltes suffiront." : "Encore un effort."
      }`,
      pourquoi: p.detail,
      lien: { href: "/ferme", label: "Voir les objectifs" },
      urgence: URGENCE.objectifProche,
      ton: "amelioration",
    });
  }

  // --- Conditions dégradées ---------------------------------------------------

  const q = [c.conditions.eau, c.conditions.lumiere, c.conditions.temperature];
  if (q.some((v) => v < 0.999)) {
    const manquant =
      c.conditions.eau < 0.999
        ? "l'eau"
        : c.conditions.lumiere < 0.999
          ? "la lumière"
          : "la température";
    out.push({
      id: "conditions",
      titre: `Ta production est bridée par ${manquant}`,
      detail:
        "Un arroseur, un plafonnier ou un chauffage électrique remettent la jauge à fond en continu, et raccourcissent tous tes cycles.",
      pourquoi: `Conditions déclarées : eau ${Math.round(c.conditions.eau * 100)} %, lumière ${Math.round(
        c.conditions.lumiere * 100
      )} %, température ${Math.round(c.conditions.temperature * 100)} %.`,
      lien: { href: "/rendement", label: "Ajuster les conditions" },
      urgence: URGENCE.reglage,
      ton: "amelioration",
    });
  }

  // --- Le réel décroche de l'estimé -------------------------------------------

  const decrochage = mesurerDecrochage(c);
  if (decrochage) out.push(decrochage);

  // --- Aucun minuteur alors que des bacs tournent -----------------------------

  if (c.plantations.length > 0 && c.timers.length === 0) {
    out.push({
      id: "lancer-minuteur",
      titre: "Lance un minuteur en plantant",
      detail:
        "C'est la seule façon de savoir quand tes gènes seront recalculés sans rester devant tes bacs. Toute l'équipe voit le même décompte.",
      pourquoi: "Des bacs déclarés, mais aucun minuteur en cours.",
      lien: { href: "/minuteurs", label: "Lancer un minuteur" },
      urgence: URGENCE.conseil,
      ton: "amelioration",
    });
  }

  return out.sort((a, b) => b.urgence - a.urgence);
}

// -----------------------------------------------------------------------------
// Remplacer une graine plantée par une meilleure en réserve
//
// C'est la seule recommandation qui chiffre un gain, donc la seule qui mérite un
// calcul complet plutôt qu'une comparaison de score. On passe par le même moteur
// que la page Rendement : le pourcentage annoncé est celui qui s'afficherait là.
// -----------------------------------------------------------------------------

function debitParHeure(
  plante: PlanteId,
  genome: Genome,
  plants: number,
  c: ContexteFerme
): number {
  const croissance = calculerCroissance(plante, genome, c.conditions, c.constantes);
  const rendement = calculerRendement(plante, genome, c.conditions, c.constantes, {
    plantsParBac: plants,
    bonusTheRecolte: 0,
    minutesCycle: croissance.minutesJusquMur,
  });
  return rendement.parHeure;
}

function meilleurRemplacement(c: ContexteFerme): Recommandation | null {
  let meilleur: {
    plantation: Plantation;
    graine: GraineUnifiee;
    gain: number;
    avant: number;
    apres: number;
  } | null = null;

  for (const p of c.plantations) {
    const actuel: Genome = p.genome ?? GENOME_VIDE;
    const plants = (CONTENANT_PAR_ID[p.contenant]?.plants ?? 1) * p.quantite;
    const avant = debitParHeure(p.plante, actuel, plants, c);

    for (const g of c.graines) {
      if (g.plante !== p.plante) continue;
      if (formatGenome(g.genome) === formatGenome(actuel)) continue;
      // Une graine dont on n'a qu'un exemplaire sert de semence, pas de plantation
      // de masse : on ne recommande pas de la sacrifier.
      if (g.quantite < 2) continue;

      const apres = debitParHeure(p.plante, g.genome, plants, c);
      if (apres <= avant * 1.05) continue; // moins de 5 % : ça ne vaut pas le geste

      const gain = apres / avant - 1;
      if (!meilleur || gain > meilleur.gain) {
        meilleur = { plantation: p, graine: g, gain, avant, apres };
      }
    }
  }

  if (!meilleur) return null;

  const nomPlante = PLANTE_PAR_ID[meilleur.plantation.plante]?.nom ?? "";
  const contenant = CONTENANT_PAR_ID[meilleur.plantation.contenant]?.nom.toLowerCase() ?? "bac";
  const ressource = PLANTE_PAR_ID[meilleur.plantation.plante]?.ressource ?? "";

  return {
    id: "remplacer-graine",
    titre: `Replante ton ${contenant} de ${nomPlante.toLowerCase()} avec ${formatGenome(meilleur.graine.genome)}`,
    detail: `Tu passerais d'environ ${formatNombre(meilleur.avant, 0)} à ${formatNombre(
      meilleur.apres,
      0
    )} ${ressource} par heure, soit +${Math.round(meilleur.gain * 100)} %.`,
    pourquoi: `Tu as ${meilleur.graine.quantite} graines ${formatGenome(
      meilleur.graine.genome
    )} en réserve, meilleures que les ${formatGenome(
      meilleur.plantation.genome ?? GENOME_VIDE
    )} actuellement déclarées${
      meilleur.plantation.genome ? "" : " — aucun gène renseigné, donc supposés bruts"
    }.`,
    lien: { href: "/ferme", label: "Modifier mes bacs" },
    urgence: URGENCE.ameliorationChiffree + Math.min(30, Math.round(meilleur.gain * 100)),
    ton: "amelioration",
  };
}

// -----------------------------------------------------------------------------
// Décrochage entre réel et estimé
// -----------------------------------------------------------------------------

function mesurerDecrochage(c: ContexteFerme): Recommandation | null {
  if (!c.debutWipe || c.recoltes.length < 3) return null;

  const heures = (Date.now() - c.debutWipe) / 3_600_000;
  if (heures < 6) return null; // trop tôt pour conclure quoi que ce soit

  let pire: { ressource: string; part: number; reel: number; attendu: number } | null = null;

  for (const ligne of c.production) {
    const attendu = ligne.parHeure * heures;
    if (attendu <= 0) continue;
    const reel = c.recoltes
      .filter((r) => r.ressource === ligne.ressource)
      .reduce((a, r) => a + r.quantite, 0);
    if (reel === 0) continue;

    const part = reel / attendu;
    if (part >= 0.4) continue;
    if (!pire || part < pire.part) pire = { ressource: ligne.ressource, part, reel, attendu };
  }

  if (!pire) return null;

  return {
    id: "decrochage",
    titre: `Tes bacs de ${pire.ressource} passent leur temps à attendre`,
    detail:
      "Le plus gros levier n'est pas d'agrandir la ferme mais de replanter plus vite après chaque récolte. Un minuteur lancé à la plantation suffit à ne plus rater le moment.",
    pourquoi: `${formatNombre(pire.reel, 0)} ${pire.ressource} enregistrés pour environ ${formatNombre(
      pire.attendu,
      0
    )} possibles, soit ${Math.round(pire.part * 100)} % du potentiel.`,
    lien: { href: "/statistiques", label: "Voir le détail" },
    urgence: URGENCE.reglage + 5,
    ton: "amelioration",
  };
}
