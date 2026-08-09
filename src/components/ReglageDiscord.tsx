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
export function ReglageDiscord({ fermeId, estProprietaire }: { fermeId: string; estProprietaire: boolean }) {
  const [configure, setConfigure] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const verifier = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data } = await sb.rpc("webhook_configure", { f: fermeId });
    setConfigure(Boolean(data));
  }, [fermeId]);

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
    <Details titre="Notifications Discord">
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

      <p className="mt-4 text-[13px] leading-relaxed text-feuille-400">
        Les messages restent rares, exprès : seulement les deux moments qui demandent une action. Un bot qui
        commente chaque changement de stade transforme le salon en spam et se fait retirer dans la semaine.
      </p>
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
