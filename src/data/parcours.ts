import type { GraineUnifiee } from "@/lib/graines";
import type { Plantation } from "@/lib/plantations";
import type { Recolte } from "@/lib/recoltes";
import type { TimerUnifie } from "@/lib/timers";
import type { Elevage } from "@/lib/elevage";

/**
 * Le parcours d'un wipe.
 *
 * Répond à un problème précis : une fois les gènes parfaits obtenus, la moitié
 * du site n'a plus d'utilité. Le parcours emmène le joueur au-delà — vers la
 * production, les thés, l'élevage — au lieu de le laisser sans but.
 *
 * Deux principes :
 *
 * 1. **Une étape se coche toute seule dès que les données le permettent.**
 *    Rien à ressaisir, jamais. Une case à cocher manuelle n'existe que pour ce
 *    qui se passe en jeu et que le site ne peut pas voir.
 *
 * 2. **Les objectifs sont atteignables.** « Ramasse trente graines de chaque »
 *    décourage plus qu'il n'aide. Les seuils correspondent à ce qu'un joueur
 *    fait vraiment dans une soirée.
 */

export interface ContexteParcours {
  graines: GraineUnifiee[];
  plantations: Plantation[];
  recoltes: Recolte[];
  timers: TimerUnifie[];
  elevage: Elevage;
  jour: number;
}

export interface Etape {
  id: string;
  titre: string;
  detail: string;
  lien?: { href: string; label: string };
  /** Renvoie `null` quand le site ne peut pas savoir : la case devient manuelle. */
  verifier?: (c: ContexteParcours) => boolean | null;
}

export interface Phase {
  id: string;
  titre: string;
  sousTitre: string;
  etapes: Etape[];
}

// --- Aides de lecture --------------------------------------------------------

const sansRouge = (g: GraineUnifiee) => !g.genome.some((l) => l === "W" || l === "X");

function quantite(c: ContexteParcours, plante: string): number {
  return c.graines.filter((g) => g.plante === plante).reduce((a, g) => a + g.quantite, 0);
}

function aParfaite(c: ContexteParcours, plante: string, mini = 1): boolean {
  return (
    c.graines
      .filter((g) => g.plante === plante && sansRouge(g))
      .reduce((a, g) => a + g.quantite, 0) >= mini
  );
}

function totalRecolte(c: ContexteParcours, ressource: string): number {
  return c.recoltes.filter((r) => r.ressource === ressource).reduce((a, r) => a + r.quantite, 0);
}

// --- Le parcours -------------------------------------------------------------

export const PHASES: Phase[] = [
  {
    id: "installation",
    titre: "S'installer",
    sousTitre: "Les premières heures",
    etapes: [
      {
        id: "graines-brutes",
        titre: "Ramasser une douzaine de graines sauvages",
        detail:
          "Chanvre et baies, en cassant les buissons de la carte. Douze suffisent pour commencer — les meilleures viendront du croisement, pas de la cueillette.",
        verifier: (c) => c.graines.reduce((a, g) => a + g.quantite, 0) >= 12,
      },
      {
        id: "scanner",
        titre: "Lire leurs gènes",
        detail:
          "Le scanner lit directement à l'écran. Sans connaître tes gènes, aucun calcul n'est possible.",
        lien: { href: "/scanner", label: "Scanner" },
        verifier: (c) => c.graines.length > 0,
      },
      {
        id: "premier-bac",
        titre: "Monter un grand bac",
        detail:
          "C'est le seul contenant où le croisement fonctionne : sa grille 3×3 est ce qui produit les probabilités.",
        lien: { href: "/ferme", label: "Déclarer mes bacs" },
        verifier: (c) => c.plantations.some((p) => p.contenant === "grand_bac"),
      },
      {
        id: "eau-lumiere",
        titre: "Brancher l'eau et la lumière",
        detail:
          "Un arroseur et un plafonnier remettent les jauges à fond en continu. C'est le gain le plus simple : tous tes cycles raccourcissent d'un coup.",
      },
    ],
  },
  {
    id: "genetique",
    titre: "Fixer la génétique",
    sousTitre: "Un à trois jours",
    etapes: [
      {
        id: "premier-plan",
        titre: "Faire ton premier croisement calculé",
        detail:
          "Saisis ta cible, laisse le site placer les neuf emplacements. Il te dira aussi tes chances réelles avant que tu ne plantes.",
        lien: { href: "/bac", label: "Gènes parfaits" },
        verifier: (c) => (c.timers.length > 0 ? true : null),
      },
      {
        id: "chanvre-parfait",
        titre: "Un chanvre sans gène rouge",
        detail: "C'est lui qui alimente tout le tissu du wipe. À faire en premier.",
        verifier: (c) => aParfaite(c, "chanvre"),
      },
      {
        id: "boutures-secours",
        titre: "Trois boutures de secours de chaque bonne graine",
        detail:
          "Une bouture copie les gènes à l'identique. Sans copie en caisse, un croisement raté te renvoie au début — c'est l'erreur la plus coûteuse du jeu.",
        verifier: (c) =>
          ["chanvre", "baie_bleue", "baie_jaune"].some((p) => aParfaite(c, p, 3)),
      },
      {
        id: "baies-parfaites",
        titre: "Une myrtille et une baie jaune sans rouge",
        detail: "Les deux baies des thés de minerai. Après elles, la génétique est derrière toi.",
        verifier: (c) => aParfaite(c, "baie_bleue") && aParfaite(c, "baie_jaune"),
      },
    ],
  },
  {
    id: "production",
    titre: "Produire",
    sousTitre: "Le cœur du wipe",
    etapes: [
      {
        id: "bacs-remplis",
        titre: "Replanter tous tes bacs avec tes bonnes graines",
        detail:
          "La génétique ne sert à rien tant qu'elle dort en caisse. C'est ici que le travail des trois premiers jours se transforme en ressources.",
        lien: { href: "/ferme", label: "Mes bacs" },
        verifier: (c) => c.plantations.length >= 3,
      },
      {
        id: "minuteur",
        titre: "Lancer un minuteur à chaque plantation",
        detail:
          "Deux touches, et tu ne rates plus une récolte. C'est ce qui sépare une ferme rentable d'une ferme qui pourrit.",
        lien: { href: "/minuteurs", label: "Minuteurs" },
        verifier: (c) => c.timers.length > 0,
      },
      {
        id: "premiere-recolte",
        titre: "Enregistrer ta première récolte",
        detail:
          "C'est la seule donnée observée du site. Sans elle, tes statistiques restent des estimations.",
        verifier: (c) => c.recoltes.length > 0,
      },
      {
        id: "tissu-5000",
        titre: "Cinq mille tissus",
        detail: "De quoi habiller l'équipe et couvrir les sacs de couchage du wipe.",
        verifier: (c) => totalRecolte(c, "tissu") >= 5000,
      },
      {
        id: "poulailler",
        titre: "Monter un poulailler",
        detail:
          "Les œufs limitent toutes les tartes. Quatre poules par poulailler, et il faut passer ramasser souvent : la case de sortie plafonne vite.",
        lien: { href: "/poulailler", label: "Poulailler" },
        verifier: (c) => c.elevage.poulaillers > 0,
      },
    ],
  },
  {
    id: "confort",
    titre: "Optimiser",
    sousTitre: "Quand la ferme tourne",
    etapes: [
      {
        id: "the-minerai",
        titre: "Préparer un thé de minerai pur",
        detail:
          "Quatre baies pour un basique, quatre basiques pour un avancé, quatre avancés pour un pur. Le calculateur remonte la chaîne depuis ce que tu vises.",
        lien: { href: "/thes", label: "Thés" },
      },
      {
        id: "tarte-ours",
        titre: "Une tarte à l'ours avec ton thé",
        detail:
          "Elle multiplie l'effet du thé de récolte par une fois et demie. C'est la combinaison la plus rentable du jeu, et presque personne ne la fait.",
        lien: { href: "/tartes", label: "Tartes" },
      },
      {
        id: "discord",
        titre: "Brancher les alertes Discord",
        detail:
          "Ton équipe prévenue sans ouvrir le site. C'est ce qui fait que plus personne ne rate une récolte.",
        lien: { href: "/aide", label: "Comment faire" },
      },
      {
        id: "calibrer",
        titre: "Chronométrer un cycle en jeu",
        detail:
          "Les durées du site sont un modèle approché. Une seule mesure réelle et tous les calculs se recalent sur ton serveur.",
        lien: { href: "/reglages", label: "Réglages" },
      },
      {
        id: "rendement",
        titre: "Atteindre 70 % de rendement réel",
        detail:
          "Ce que tu récoltes vraiment, rapporté à ce que ta ferme pourrait produire. Au-dessus de 70 %, tu en tires l'essentiel.",
        lien: { href: "/statistiques", label: "Statistiques" },
      },
    ],
  },
];

export const TOUTES_LES_ETAPES = PHASES.flatMap((p) => p.etapes);
