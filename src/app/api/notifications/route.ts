import { createClient } from "@supabase/supabase-js";
import { PLANTE_PAR_ID } from "@/data/game";

// -----------------------------------------------------------------------------
// Envoi des notifications Discord
//
// Première route serveur du projet. Elle est la seule à utiliser la clé de
// service, qui contourne toutes les politiques de la base — elle ne doit donc
// JAMAIS apparaître dans une variable NEXT_PUBLIC_ ni atteindre le navigateur.
//
// Appelée par une tâche planifiée externe. Le plan Hobby de Vercel limite ses
// propres tâches à une exécution par jour, ce qui est inutilisable pour des
// minuteurs : on passe donc par GitHub Actions, qui appelle cette route toutes
// les dix minutes. Effet de bord utile, ça maintient aussi le projet Supabase
// éveillé, lui qui se met en pause après sept jours sans requête.
// -----------------------------------------------------------------------------

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Marge de rattrapage : un seuil franchi juste après un passage doit être
 *  envoyé au suivant, pas oublié. Généreuse, parce que le doublon est empêché
 *  par la clé primaire du journal d'envois, pas par cette fenêtre. */
const FENETRE_MINUTES = 180;

interface LigneTimer {
  id: string;
  nom: string;
  plante: string;
  genes: string | null;
  debut: string;
  minutes_croisement: number;
  minutes_mur: number;
  minutes_fin: number;
  wipes: {
    ferme_id: string;
    fermes: { nom: string } | null;
  } | null;
  profils: { pseudo: string } | null;
}

export async function GET(requete: Request) {
  const secret = process.env.CRON_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cleService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // L'authentification passe avant tout le reste : un appelant non autorisé ne
  // doit rien apprendre, pas même l'état de la configuration du serveur.
  // Sans ce contrôle, n'importe qui pourrait déclencher des envois en boucle.
  if (!secret || requete.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ erreur: "non autorisé" }, { status: 401 });
  }

  if (!url || !cleService) {
    return Response.json({ erreur: "configuration serveur incomplète" }, { status: 500 });
  }

  const sb = createClient(url, cleService, { auth: { persistSession: false } });
  const maintenant = Date.now();
  const depuis = new Date(maintenant - FENETRE_MINUTES * 60_000).toISOString();

  // On ne remonte que les minuteurs assez récents pour qu'un seuil ait pu être
  // franchi dans la fenêtre : inutile de relire tout l'historique.
  const { data, error } = await sb
    .from("timers")
    .select(
      "id, nom, plante, genes, debut, minutes_croisement, minutes_mur, minutes_fin, wipes!inner ( ferme_id, fermes!inner ( nom ) ), profils:cree_par ( pseudo )"
    )
    .eq("archive", false)
    .gte("debut", new Date(maintenant - 7 * 24 * 3600_000).toISOString());

  if (error) {
    return Response.json({ erreur: error.message }, { status: 500 });
  }

  const timers = (data ?? []) as unknown as LigneTimer[];

  // Seuils franchis récemment, tous timers confondus.
  const candidats: { timerId: string; type: "croisement" | "mur"; ligne: LigneTimer }[] = [];
  for (const t of timers) {
    const debut = new Date(t.debut).getTime();
    for (const [type, minutes] of [
      ["croisement", Number(t.minutes_croisement)],
      ["mur", Number(t.minutes_mur)],
    ] as const) {
      const instant = debut + minutes * 60_000;
      if (instant <= maintenant && instant >= new Date(depuis).getTime()) {
        candidats.push({ timerId: t.id, type, ligne: t });
      }
    }
  }

  if (candidats.length === 0) {
    return Response.json({ envoyes: 0, examines: timers.length });
  }

  // Ce qui est déjà parti. La clé primaire du journal empêche le doublon même en
  // cas d'exécutions concurrentes ; cette lecture évite juste des appels inutiles.
  const { data: deja } = await sb
    .from("notifications_envoyees")
    .select("timer_id, type")
    .in("timer_id", [...new Set(candidats.map((c) => c.timerId))]);

  const dejaEnvoye = new Set(
    ((deja ?? []) as { timer_id: string; type: string }[]).map((d) => `${d.timer_id}:${d.type}`)
  );

  const aEnvoyer = candidats.filter((c) => !dejaEnvoye.has(`${c.timerId}:${c.type}`));
  if (aEnvoyer.length === 0) {
    return Response.json({ envoyes: 0, examines: timers.length });
  }

  // Webhooks des fermes concernées.
  const fermes = [...new Set(aEnvoyer.map((c) => c.ligne.wipes?.ferme_id).filter(Boolean))] as string[];
  const { data: integrations } = await sb
    .from("integrations")
    .select("ferme_id, webhook_discord")
    .in("ferme_id", fermes)
    .eq("actif", true);

  const webhookDe = new Map(
    ((integrations ?? []) as { ferme_id: string; webhook_discord: string | null }[])
      .filter((i) => i.webhook_discord)
      .map((i) => [i.ferme_id, i.webhook_discord as string])
  );

  let envoyes = 0;
  const echecs: string[] = [];

  for (const c of aEnvoyer) {
    const fermeId = c.ligne.wipes?.ferme_id;
    const webhook = fermeId ? webhookDe.get(fermeId) : undefined;

    // Pas de webhook : on note quand même l'envoi comme traité, sinon ces
    // seuils seraient réexaminés à chaque passage jusqu'à sortir de la fenêtre.
    if (!webhook) {
      await sb.from("notifications_envoyees").insert({ timer_id: c.timerId, type: c.type });
      continue;
    }

    // Le message dit ce qu'il faut FAIRE, pas ce que le jeu a calculé, et il
    // commence par l'emplacement : dans une base à quinze bacs, savoir QUOI
    // faire ne sert à rien si on ne sait pas OÙ.
    //
    // L'emplacement est le repère libre saisi au lancement du minuteur. Pas de
    // lien vers une plantation déclarée : une plantation représente « N grands
    // bacs de chanvre », pas un bac précis. Elle ne saurait donc pas dire
    // « bac 3 », et un identifiant technique ne parlerait à personne. Le nom que
    // la personne donne à son bac reste le plus juste.
    const auteur = c.ligne.profils?.pseudo;
    const infos = PLANTE_PAR_ID[c.ligne.plante];
    const plante = (infos?.nom ?? "plant").toLowerCase();

    // Le nom du bac ouvre le message : « Bac 3 » dit où aller, « Chanvre GGGYYY »
    // ne dit que ce qu'on savait déjà. Quand aucun nom n'a été saisi, le site en
    // génère un à partir de la plante et des gènes — inutile de le répéter.
    const nomAutomatique = `${infos?.nom ?? ""} ${c.ligne.genes ?? ""}`.trim();
    const bac = c.ligne.nom.trim() === nomAutomatique ? null : c.ligne.nom.trim();
    const accord = infos?.genre === "f" ? "prête" : "prêt";

    const genes = c.ligne.genes ? ` ${c.ligne.genes}` : "";
    const signature = auteur ? `\n-# planté par ${auteur}` : "";

    const contenu =
      c.type === "croisement"
        ? `🧬 **${c.ligne.nom} — le croisement est fait.**\n` +
          `Va inspecter ce plant de ${plante}${genes} en jeu pour découvrir ses nouveaux gènes. ` +
          `S'ils te plaisent, bouture-le (hache en main) : la bouture les copie à l'identique.` +
          signature
        : `🌾 **${c.ligne.nom} — ${accord} à récolter.**\n` +
          `Ce plant de ${plante}${genes} est au rendement maximum. Passe le ramasser : ` +
          `ensuite il dépérit et tu perds les fruits.` +
          signature;

    try {
      const reponse = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contenu, username: "RustiCulture" }),
      });

      if (!reponse.ok) {
        echecs.push(`${c.timerId}: ${reponse.status}`);
        // Un webhook supprimé côté Discord renvoie 404 : on désactive
        // l'intégration plutôt que de réessayer indéfiniment.
        if (reponse.status === 404 && fermeId) {
          await sb.from("integrations").update({ actif: false }).eq("ferme_id", fermeId);
        }
        continue;
      }

      await sb.from("notifications_envoyees").insert({ timer_id: c.timerId, type: c.type });
      envoyes++;
    } catch {
      echecs.push(`${c.timerId}: réseau`);
    }
  }

  return Response.json({ envoyes, examines: timers.length, echecs: echecs.length });
}
