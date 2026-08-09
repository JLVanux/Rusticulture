"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Champ, Details, Note } from "@/components/Ui";
import { messageErreur, supabase } from "@/lib/supabase";

/**
 * Configuration du webhook Discord.
 *
 * L'URL n'est jamais relue : la table qui la contient n'a aucune politique de
 * lecture, donc le navigateur ne peut pas y accéder — pas même celui du
 * propriétaire. On affiche « configuré » ou « non configuré », et on remplace.
 *
 * C'est volontairement plus strict que pour le reste du site : contrairement
 * aux clés publiques de Supabase, cette URL est un vrai secret. Qui l'a peut
 * écrire dans le salon en se faisant passer pour le site.
 */
interface Prefs {
  notif_croisement: boolean;
  notif_recolte: boolean;
  notif_deperit: boolean;
  notif_membre: boolean;
  notif_membre_parti: boolean;
  notif_plantation: boolean;
  notif_recolte_saisie: boolean;
  notif_point_quotidien: boolean;
  heure_point: number;
}

const REGLAGES: { cle: keyof Prefs; titre: string; detail: string }[] = [
  {
    cle: "notif_croisement",
    titre: "Croisement terminé",
    detail: "Les gènes viennent d'être recalculés : c'est le moment d'aller bouturer.",
  },
  {
    cle: "notif_recolte",
    titre: "Récolte prête",
    detail: "Le plant est mûr. Passé ce stade il dépérit et les fruits sont perdus.",
  },
  {
    cle: "notif_deperit",
    titre: "Plant en train de mourir",
    detail:
      "La fenêtre de récolte se ferme et les fruits vont être perdus. C'est l'alerte la plus rentable des trois.",
  },
  {
    cle: "notif_plantation",
    titre: "Quelqu'un a planté",
    detail: "Utile à plusieurs pour éviter de replanter le même bac. Bavard sur une grosse ferme.",
  },
  {
    cle: "notif_recolte_saisie",
    titre: "Récolte enregistrée",
    detail: "Quand un membre saisit ce qu'il a ramassé.",
  },
  {
    cle: "notif_membre",
    titre: "Arrivée d'un coéquipier",
    detail: "Quelqu'un rejoint la ferme avec le code d'invitation.",
  },
  {
    cle: "notif_membre_parti",
    titre: "Départ d'un coéquipier",
    detail: "Quelqu'un quitte la ferme, ou en est retiré par le propriétaire.",
  },
  {
    cle: "notif_point_quotidien",
    titre: "Point quotidien",
    detail: "Un message par jour : jour du wipe, production totale, réserves.",
  },
];

export function ReglageDiscord({ fermeId, estProprietaire }: { fermeId: string; estProprietaire: boolean }) {
  const [configure, setConfigure] = useState<boolean | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [url, setUrl] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const verifier = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data } = await sb.rpc("webhook_configure", { f: fermeId });
    setConfigure(Boolean(data));
    // Les préférences sont lisibles, contrairement au webhook lui-même :
    // ce ne sont pas des secrets.
    const { data: p } = await sb.rpc("preferences_notifications", { f: fermeId });
    setPrefs((p as Prefs) ?? null);
  }, [fermeId]);

  async function changer(cle: keyof Prefs, valeur: boolean | number) {
    const sb = supabase();
    if (!sb || !prefs) return;
    setPrefs({ ...prefs, [cle]: valeur });
    const { error } = await sb.rpc("regler_notification", {
      f: fermeId,
      champ: cle,
      valeur_bool: typeof valeur === "boolean" ? valeur : null,
      valeur_int: typeof valeur === "number" ? valeur : null,
    });
    if (error) setErreur(traduire(messageErreur(error)));
  }

  useEffect(() => {
    void verifier();
  }, [verifier]);

  async function definir(nouvelle: string | null) {
    const sb = supabase();
    if (!sb) return;
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      const { error } = await sb.rpc("definir_webhook", { f: fermeId, url: nouvelle });
      if (error) throw error;
      setUrl("");
      setMessage(nouvelle ? "Webhook enregistré." : "Webhook retiré.");
      await verifier();
    } catch (e) {
      setErreur(traduire(messageErreur(e)));
    } finally {
      setOccupe(false);
    }
  }

  if (!estProprietaire) return null;

  return (
    <Details titre="Notifications Discord" ouvert>
      <p className="text-[14px] leading-relaxed text-feuille-200">
        Reçois dans un salon Discord un message quand un plant est prêt à bouturer, puis quand il est prêt à
        récolter. C&apos;est la seule façon d&apos;être prévenu sans garder un onglet ouvert.{" "}
        <Link href="/aide/discord" className="text-lampe-chaud underline underline-offset-2">
          Guide complet
        </Link>
        .
      </p>

      <ol className="mt-4 space-y-2 text-[14px] leading-relaxed text-feuille-200">
        <li>
          <span className="text-feuille-100">1.</span> Dans ton serveur Discord, ouvre les paramètres du salon
          voulu → Intégrations → Créer un webhook.
        </li>
        <li>
          <span className="text-feuille-100">2.</span> Copie l&apos;URL du webhook.
        </li>
        <li>
          <span className="text-feuille-100">3.</span> Colle-la ci-dessous. Rien à installer, aucune application
          à autoriser.
        </li>
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={`puce ${configure ? "border-gene-g/50 text-gene-g" : "border-nuit-500 text-feuille-400"}`}
        >
          {configure === null ? "vérification…" : configure ? "configuré" : "non configuré"}
        </span>
        {configure && (
          <button
            type="button"
            className="bouton bouton-danger"
            disabled={occupe}
            onClick={() => {
              if (confirm("Retirer le webhook ? Les notifications cesseront.")) void definir(null);
            }}
          >
            Retirer
          </button>
        )}
      </div>

      <div className="mt-4">
        <Champ
          label={configure ? "Remplacer par une autre URL" : "URL du webhook"}
          aide="Elle ne sera plus jamais réaffichée, même à toi : c'est un secret, il ne redescend pas dans le navigateur."
        >
          <input
            className="champ font-mono text-[13px]"
            placeholder="https://discord.com/api/webhooks/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Champ>
        <button
          type="button"
          className="bouton bouton-primaire mt-3"
          disabled={occupe || url.trim().length < 20}
          onClick={() => void definir(url)}
        >
          {occupe ? "…" : "Enregistrer"}
        </button>
      </div>

      {erreur && (
        <div className="mt-3">
          <Note ton="alerte">{erreur}</Note>
        </div>
      )}
      {message && <p className="mt-3 font-mono text-[13px] text-gene-g">{message}</p>}

      {configure && prefs && (
        <div className="mt-6 border-t border-trait pt-5">
          <div className="eyebrow mb-3">Ce que ta ferme reçoit</div>
          <ul className="grid gap-px overflow-hidden rounded-sm border border-trait bg-trait">
            {REGLAGES.map((r) => (
              <li key={r.cle} className="bg-case p-3.5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(prefs[r.cle])}
                    disabled={!estProprietaire}
                    onChange={(e) => void changer(r.cle, e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-rouille"
                  />
                  <span className="min-w-0">
                    <span className="font-display text-[15px] font-bold text-craie">{r.titre}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-cendre">
                      {r.detail}
                    </span>
                  </span>
                </label>

                {r.cle === "notif_point_quotidien" && prefs.notif_point_quotidien && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
                    <span className="text-[13px] text-cendre">Vers</span>
                    <select
                      className="champ w-auto py-1.5"
                      value={prefs.heure_point}
                      onChange={(e) => void changer("heure_point", Number(e.target.value))}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")} h UTC
                        </option>
                      ))}
                    </select>
                    <span className="text-[13px] text-poussiere">
                      heure UTC — une ferme peut réunir plusieurs fuseaux
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[13px] leading-relaxed text-poussiere">
            Les deux premiers sont actifs par défaut : ce sont les seuls qui demandent une action. Les
            autres sont utiles à plusieurs mais deviennent bavards sur une grosse ferme — et un salon noyé
            finit par être coupé, ce qui emporte aussi les messages qui servaient.
          </p>
        </div>
      )}
    </Details>
  );
}

function traduire(m: string): string {
  if (m.includes("ne ressemble pas")) {
    return "Cette adresse ne ressemble pas à un webhook Discord. Elle doit commencer par https://discord.com/api/webhooks/";
  }
  if (m.includes("reserve au proprietaire")) return "Seul le propriétaire de la ferme peut configurer ça.";
  return m;
}
