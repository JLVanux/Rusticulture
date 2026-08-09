import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLANTE_PAR_ID } from "@/data/game";
import {
  carteCroisement,
  carteDeperit,
  cartePlantation,
  carteRecolte,
  cartePointQuotidien,
  carteMembreArrive,
  carteMembreParti,
  carteMur,
  corpsWebhook,
  COULEURS,
  type Carte,
} from "@/lib/cartes-discord";

// -----------------------------------------------------------------------------
// Envoi des notifications Discord
//
// Deux façons d'appeler cette route, et c'est volontaire.
//
// 1. **La tâche planifiée**, avec le secret : elle balaie toutes les fermes.
//    Elle est déclenchée par `pg_cron` depuis la base elle-même, toutes les
//    minutes. GitHub Actions remplissait ce rôle auparavant, mais ses runners
//    gratuits accusent dix à trente minutes de retard — constaté en production,
//    et rédhibitoire pour une alerte de récolte.
//
// 2. **Un membre connecté**, avec son jeton de session : elle ne traite que ses
//    propres fermes. C'est ce qui rend les notifications quasi immédiates dès
//    que quelqu'un de l'équipe a le site ouvert, sans rien exposer : le jeton
//    est vérifié et les fermes traitées sont celles où l'appelant est membre.
//
// La clé de service ne quitte jamais le serveur. Elle contourne toutes les
// politiques, c'est elle qui permet de lire les webhooks.
// -----------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fenêtre de rattrapage. Généreuse : le doublon est empêché par la clé du
 *  journal d'envois, pas par cette borne. */
const FENETRE_MINUTES = 180;

interface Preferences {
  ferme_id: string;
  webhook_discord: string | null;
  notif_croisement: boolean;
  notif_recolte: boolean;
  notif_plantation: boolean;
  notif_membre: boolean;
  notif_membre_parti: boolean;
  notif_recolte_saisie: boolean;
  notif_point_quotidien: boolean;
  notif_deperit: boolean;
  heure_point: number;
}

interface Envoi {
  fermeId: string;
  cle: string;
  carte: Carte;
}

export async function GET(requete: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cleService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = process.env.CRON_SECRET;

  const entete = requete.headers.get("authorization") ?? "";
  const jeton = entete.startsWith("Bearer ") ? entete.slice(7) : "";
  if (!jeton) return Response.json({ erreur: "non autorisé" }, { status: 401 });

  const estTachePlanifiee = Boolean(secret) && jeton === secret;

  // Un appelant non authentifié ne doit rien apprendre, pas même que le serveur
  // est mal configuré. Seule la tâche planifiée, qui s'est déjà identifiée, a
  // droit au vrai diagnostic.
  if (!url || !cleService) {
    return estTachePlanifiee
      ? Response.json({ erreur: "configuration serveur incomplète" }, { status: 500 })
      : Response.json({ erreur: "non autorisé" }, { status: 401 });
  }

  const sb = createClient(url, cleService, { auth: { persistSession: false } });

  // Qui appelle : la tâche planifiée, ou un membre ?
  let fermesAutorisees: string[] | null = null;
  if (!estTachePlanifiee) {
    const { data, error } = await sb.auth.getUser(jeton);
    if (error || !data.user) return Response.json({ erreur: "non autorisé" }, { status: 401 });

    const { data: membres } = await sb
      .from("membres")
      .select("ferme_id")
      .eq("profil_id", data.user.id);
    fermesAutorisees = ((membres ?? []) as { ferme_id: string }[]).map((m) => m.ferme_id);
    if (fermesAutorisees.length === 0) return Response.json({ envoyes: 0, fermes: 0 });
  }

  // Fermes qui ont un webhook actif.
  let requetePrefs = sb
    .from("integrations")
    .select(
      "ferme_id, webhook_discord, notif_croisement, notif_recolte, notif_deperit, notif_plantation, notif_recolte_saisie, notif_membre, notif_membre_parti, notif_point_quotidien, heure_point"
    )
    .eq("actif", true)
    .not("webhook_discord", "is", null);
  if (fermesAutorisees) requetePrefs = requetePrefs.in("ferme_id", fermesAutorisees);

  const { data: prefsBrutes, error } = await requetePrefs;
  if (error) return Response.json({ erreur: error.message }, { status: 500 });

  const prefs = (prefsBrutes ?? []) as Preferences[];
  if (prefs.length === 0) return Response.json({ envoyes: 0, fermes: 0 });

  const maintenant = Date.now();
  const envois: Envoi[] = [];

  for (const p of prefs) {
    envois.push(...(await rassembler(sb, p, maintenant)));
  }

  if (envois.length === 0) {
    return Response.json({ envoyes: 0, fermes: prefs.length });
  }

  // Ce qui est déjà parti. La clé primaire empêche le doublon même si deux
  // exécutions se croisent ; cette lecture évite juste des appels inutiles.
  const { data: deja } = await sb
    .from("notifs_envoyees")
    .select("ferme_id, cle")
    .in("ferme_id", [...new Set(envois.map((e) => e.fermeId))]);

  const dejaEnvoye = new Set(
    ((deja ?? []) as { ferme_id: string; cle: string }[]).map((d) => `${d.ferme_id}|${d.cle}`)
  );

  const webhookDe = new Map(prefs.map((p) => [p.ferme_id, p.webhook_discord as string]));
  let envoyes = 0;
  let echecs = 0;

  for (const e of envois) {
    if (dejaEnvoye.has(`${e.fermeId}|${e.cle}`)) continue;
    const webhook = webhookDe.get(e.fermeId);
    if (!webhook) continue;

    try {
      const reponse = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpsWebhook(e.carte)),
      });

      if (!reponse.ok) {
        echecs++;
        // Un webhook supprimé côté Discord renvoie 404 : on désactive
        // l'intégration plutôt que de réessayer indéfiniment.
        if (reponse.status === 404) {
          await sb.from("integrations").update({ actif: false }).eq("ferme_id", e.fermeId);
        }
        continue;
      }

      await sb.from("notifs_envoyees").insert({ ferme_id: e.fermeId, cle: e.cle });
      envoyes++;
    } catch {
      echecs++;
    }
  }

  return Response.json({ envoyes, echecs, fermes: prefs.length });
}

// -----------------------------------------------------------------------------
// Ce qu'il y a à envoyer pour une ferme
// -----------------------------------------------------------------------------

async function rassembler(
  sb: SupabaseClient,
  p: Preferences,
  maintenant: number
): Promise<Envoi[]> {
  const envois: Envoi[] = [];

  const { data: wipe } = await sb
    .from("wipes")
    .select("id, nom, debut")
    .eq("ferme_id", p.ferme_id)
    .eq("actif", true)
    .maybeSingle();
  if (!wipe) return envois;

  const w = wipe as { id: string; nom: string; debut: string };
  const depuis = new Date(maintenant - FENETRE_MINUTES * 60_000).toISOString();

  // --- Seuils de minuteur ---------------------------------------------------
  if (p.notif_croisement || p.notif_recolte) {
    const { data } = await sb
      .from("timers")
      .select(
        "id, nom, plante, genes, debut, minutes_croisement, minutes_mur, minutes_fin, profils:cree_par ( pseudo )"
      )
      .eq("wipe_id", w.id)
      .eq("archive", false)
      .gte("debut", new Date(maintenant - 7 * 24 * 3600_000).toISOString());

    for (const t of (data ?? []) as unknown as LigneTimer[]) {
      const debut = new Date(t.debut).getTime();
      const seuils = [
        ["croisement", Number(t.minutes_croisement), p.notif_croisement],
        ["mur", Number(t.minutes_mur), p.notif_recolte],
        // Le dépérissement : la fenêtre se ferme et les fruits sont perdus.
        // C'est l'alerte la plus rentable, et elle manquait.
        ["deperit", Number(t.minutes_fin), p.notif_deperit],
        // La plantation elle-même : un seuil à zéro minute. On la tire du
        // minuteur et non du journal, parce que seule cette ligne connaît les
        // durées — et c'est justement ce qu'on veut annoncer.
        ["plantation", 0, p.notif_plantation],
      ] as const;

      for (const [type, minutes, active] of seuils) {
        if (!active) continue;
        const instant = debut + minutes * 60_000;
        if (instant > maintenant || instant < new Date(depuis).getTime()) continue;
        envois.push({
          fermeId: p.ferme_id,
          cle: `timer:${t.id}:${type}`,
          carte: carteTimer(t, type),
        });
      }
    }
  }

  // --- Journal d'activité ---------------------------------------------------
  //
  // Ces événements se produisent dans le site, pas dans le temps. On les lit
  // depuis `activites` plutôt que de les envoyer depuis le navigateur : le
  // webhook est un secret, il ne doit jamais y descendre.
  if (p.notif_recolte_saisie || p.notif_membre || p.notif_membre_parti) {
    const types: string[] = [];
    if (p.notif_recolte_saisie) types.push("recolte_enregistree");
    if (p.notif_membre) types.push("membre_rejoint");
    if (p.notif_membre_parti) types.push("membre_parti", "membre_retire");

    const { data } = await sb
      .from("activites")
      .select("id, type, donnees, cree_le, profils:acteur ( pseudo )")
      .eq("wipe_id", w.id)
      .in("type", types)
      .gte("cree_le", depuis);

    for (const a of (data ?? []) as unknown as LigneActivite[]) {
      const carte = carteActivite(a, w.nom);
      if (carte) {
        envois.push({ fermeId: p.ferme_id, cle: `activite:${a.id}`, carte });
      }
    }
  }

  // --- Point quotidien ------------------------------------------------------
  if (p.notif_point_quotidien) {
    const heure = new Date(maintenant).getUTCHours();
    if (heure === p.heure_point) {
      const jour = new Date(maintenant).toISOString().slice(0, 10);
      const bilan = await pointQuotidien(sb, w);
      if (bilan) {
        envois.push({
          fermeId: p.ferme_id,
          cle: `point:${jour}`,
          carte: cartePointQuotidien(bilan),
        });
      }
    }
  }

  return envois;
}

// -----------------------------------------------------------------------------
// Rédaction
//
// Les messages disent ce qu'il faut FAIRE. « Les gènes viennent d'être
// recalculés » est exact mais ne parle qu'à qui a déjà la mécanique en tête.
// -----------------------------------------------------------------------------

interface LigneTimer {
  id: string;
  nom: string;
  plante: string;
  genes: string | null;
  debut: string;
  minutes_croisement: number;
  minutes_mur: number;
  minutes_fin: number;
  profils: { pseudo: string } | null;
}

interface LigneActivite {
  id: string;
  type: string;
  donnees: Record<string, unknown>;
  cree_le: string;
  profils: { pseudo: string } | null;
}

/**
 * La carte d'un seuil franchi.
 *
 * Le nom du bac ouvre le titre — « Bac 3 » dit où aller, « Chanvre GGGYYY » ne
 * dit que ce qu'on savait déjà. Quand aucun nom n'a été saisi, le site reconnaît
 * son propre libellé automatique et ne le répète pas.
 */
function carteTimer(
  t: LigneTimer,
  type: "croisement" | "mur" | "deperit" | "plantation"
): Carte {
  const infos = PLANTE_PAR_ID[t.plante];
  const nomAuto = `${infos?.nom ?? ""} ${t.genes ?? ""}`.trim();
  // Ce qu'il reste à courir, compté depuis maintenant.
  const ecoule = (Date.now() - new Date(t.debut).getTime()) / 60_000;
  const plant = {
    nomBac: t.nom.trim() === nomAuto ? null : t.nom.trim(),
    plante: t.plante,
    genes: t.genes,
    auteur: t.profils?.pseudo ?? null,
    avantCroisement: Number(t.minutes_croisement) - ecoule,
    avantRecolte: Number(t.minutes_mur) - ecoule,
    avantFin: Number(t.minutes_fin) - ecoule,
  };
  if (type === "plantation") return cartePlantation(plant);
  if (type === "croisement") return carteCroisement(plant);
  if (type === "mur") return carteMur(plant);
  return carteDeperit(plant);
}

/**
 * La carte d'une action enregistrée dans le journal.
 *
 * Même traitement que les cartes de minuteur : titre, couleur, champs. Une
 * notification qui ressemble à une autre se lit sans effort ; deux mises en
 * forme différentes dans le même salon donnent l'impression de deux outils.
 */
function carteActivite(a: LigneActivite, nomFerme: string): Carte | null {
  const qui = a.profils?.pseudo ?? null;
  const d = a.donnees ?? {};

  if (a.type === "recolte_enregistree") {
    const n = typeof d.nombre === "number" ? d.nombre : 0;
    const r = typeof d.ressource === "string" ? d.ressource : "ressources";
    return carteRecolte(qui, r, n);
  }

  return null;
}

/**
 * Le point quotidien : un chiffre dont on est fier, une chose à faire.
 *
 * Un seul message par jour. C'est ce qui installe une habitude sans devenir un
 * rappel qu'on finit par couper — et une notification coupée emporte avec elle
 * celles qui servaient.
 */
async function pointQuotidien(
  sb: SupabaseClient,
  w: { id: string; nom: string; debut: string }
): Promise<{ jour: number; nom: string; totaux: { ressource: string; total: number }[]; graines: number; enCours: number } | null> {
  const [recoltes, timers, graines] = await Promise.all([
    sb.from("recoltes").select("ressource, quantite").eq("wipe_id", w.id),
    sb.from("timers").select("id").eq("wipe_id", w.id).eq("archive", false),
    sb.from("graines").select("quantite").eq("wipe_id", w.id),
  ]);

  const lignes = (recoltes.data ?? []) as { ressource: string; quantite: number }[];
  if (lignes.length === 0) return null; // rien à raconter, on se tait

  const parRessource = new Map<string, number>();
  for (const r of lignes) {
    parRessource.set(r.ressource, (parRessource.get(r.ressource) ?? 0) + r.quantite);
  }
  const totaux = [...parRessource.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([ressource, total]) => ({ ressource, total }));

  const jour =
    Math.floor((Date.now() - new Date(w.debut).getTime()) / 86_400_000) + 1;
  const nbGraines = ((graines.data ?? []) as { quantite: number }[]).reduce(
    (a, g) => a + g.quantite,
    0
  );
  const enCours = (timers.data ?? []).length;

  return { jour, nom: w.nom, totaux, graines: nbGraines, enCours };
}
