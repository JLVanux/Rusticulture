import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLANTE_PAR_ID } from "@/data/game";

// -----------------------------------------------------------------------------
// Envoi des notifications Discord
//
// Deux façons d'appeler cette route, et c'est volontaire.
//
// 1. **La tâche planifiée**, avec le secret : elle balaie toutes les fermes.
//    GitHub Actions ne garantit pas la ponctualité — un passage prévu toutes les
//    dix minutes peut glisser, voire sauter en période de charge.
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
  notif_recolte_saisie: boolean;
  notif_point_quotidien: boolean;
  notif_deperit: boolean;
  heure_point: number;
}

interface Envoi {
  fermeId: string;
  cle: string;
  contenu: string;
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
      "ferme_id, webhook_discord, notif_croisement, notif_recolte, notif_deperit, notif_plantation, notif_recolte_saisie, notif_point_quotidien, heure_point"
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
        body: JSON.stringify({ content: e.contenu, username: "RustiCulture" }),
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
      ] as const;

      for (const [type, minutes, active] of seuils) {
        if (!active) continue;
        const instant = debut + minutes * 60_000;
        if (instant > maintenant || instant < new Date(depuis).getTime()) continue;
        envois.push({
          fermeId: p.ferme_id,
          cle: `timer:${t.id}:${type}`,
          contenu: messageTimer(t, type),
        });
      }
    }
  }

  // --- Journal d'activité ---------------------------------------------------
  //
  // Ces événements se produisent dans le site, pas dans le temps. On les lit
  // depuis `activites` plutôt que de les envoyer depuis le navigateur : le
  // webhook est un secret, il ne doit jamais y descendre.
  if (p.notif_plantation || p.notif_recolte_saisie) {
    const types: string[] = [];
    if (p.notif_plantation) types.push("timer_lance");
    if (p.notif_recolte_saisie) types.push("recolte_enregistree");

    const { data } = await sb
      .from("activites")
      .select("id, type, donnees, cree_le, profils:acteur ( pseudo )")
      .eq("wipe_id", w.id)
      .in("type", types)
      .gte("cree_le", depuis);

    for (const a of (data ?? []) as unknown as LigneActivite[]) {
      const message = messageActivite(a);
      if (message) {
        envois.push({ fermeId: p.ferme_id, cle: `activite:${a.id}`, contenu: message });
      }
    }
  }

  // --- Point quotidien ------------------------------------------------------
  if (p.notif_point_quotidien) {
    const heure = new Date(maintenant).getUTCHours();
    if (heure === p.heure_point) {
      const jour = new Date(maintenant).toISOString().slice(0, 10);
      const message = await pointQuotidien(sb, w);
      if (message) {
        envois.push({ fermeId: p.ferme_id, cle: `point:${jour}`, contenu: message });
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

function messageTimer(t: LigneTimer, type: "croisement" | "mur" | "deperit"): string {
  const infos = PLANTE_PAR_ID[t.plante];
  const plante = (infos?.nom ?? "plant").toLowerCase();
  const possessif = infos?.genre === "f" ? "ta" : "ton";
  const accord = infos?.genre === "f" ? "prête" : "prêt";

  const nomAuto = `${infos?.nom ?? ""} ${t.genes ?? ""}`.trim();
  const bac = t.nom.trim() === nomAuto ? null : t.nom.trim();
  const signature = `\n-# ${t.genes ?? ""}${t.profils?.pseudo ? ` · planté par ${t.profils.pseudo}` : ""}`;

  if (type === "deperit") {
    return (
      `⚠️ **${bac ? `${bac} — ` : ""}${bac ? possessif : possessif === "ta" ? "Ta" : "Ton"} ${plante} est en train de mourir.**\n` +
      `La fenêtre de récolte se ferme. Passé ce point il ne reste que de la fibre.` +
      signature
    );
  }

  return type === "croisement"
    ? `🧬 **${bac ? `${bac} — v` : "V"}a voir ${possessif} ${plante}, le croisement est fait.**\n` +
        `Inspecte le plant en jeu pour découvrir ses nouveaux gènes. S'ils te plaisent, bouture-le : la bouture les copie à l'identique.` +
        signature
    : `🌾 **${bac ? `${bac} — ` : ""}${bac ? possessif : possessif === "ta" ? "Ta" : "Ton"} ${plante} est ${accord} à récolter.**\n` +
        `C'est le rendement maximum. Passe le ramasser : ensuite le plant dépérit et tu perds les fruits.` +
        signature;
}

function messageActivite(a: LigneActivite): string | null {
  const qui = a.profils?.pseudo ?? "Quelqu'un";
  const d = a.donnees ?? {};

  if (a.type === "timer_lance") {
    const nom = typeof d.nom === "string" ? d.nom : "un plant";
    const plante =
      typeof d.plante === "string" ? PLANTE_PAR_ID[d.plante]?.nom.toLowerCase() : null;
    return `🌱 ${qui} vient de planter **${nom}**${plante ? ` — ${plante}` : ""}.`;
  }

  if (a.type === "recolte_enregistree") {
    const n = typeof d.nombre === "number" ? d.nombre : null;
    const r = typeof d.ressource === "string" ? d.ressource : "ressources";
    return `📦 ${qui} a récolté **${n?.toLocaleString("fr-FR") ?? "?"} ${r}**.`;
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
): Promise<string | null> {
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
    .slice(0, 3)
    .map(([r, q]) => `${q.toLocaleString("fr-FR")} ${r}`)
    .join(" · ");

  const jour =
    Math.floor((Date.now() - new Date(w.debut).getTime()) / 86_400_000) + 1;
  const nbGraines = ((graines.data ?? []) as { quantite: number }[]).reduce(
    (a, g) => a + g.quantite,
    0
  );
  const enCours = (timers.data ?? []).length;

  return (
    `📊 **Jour ${jour} — ${w.nom}**\n` +
    `${totaux}\n` +
    `-# ${nbGraines} graines en réserve · ${enCours} minuteur${enCours > 1 ? "s" : ""} en cours`
  );
}
