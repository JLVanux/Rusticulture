"use client";

import { useState } from "react";
import Link from "next/link";
import { Champ, Choix, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { supprimerMonCompte, useSession } from "@/lib/compte";
import { adresseDerivee, pseudoValable } from "@/lib/pseudo";
import { messageErreur, supabase, supabaseConfigure } from "@/lib/supabase";

type Mode = "inscription" | "connexion";

const LONGUEUR_MINI = 8;

export default function PageCompte() {
  const { connecte, profil, charge, deconnexion } = useSession();
  const [mode, setMode] = useState<Mode>("inscription");
  const [pseudo, setPseudo] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function valider() {
    const sb = supabase();
    if (!sb) return;
    setOccupe(true);
    setErreur(null);
    try {
      const email = adresseDerivee(pseudo);
      if (mode === "inscription") {
        const { error } = await sb.auth.signUp({
          email,
          password: motDePasse,
          // Repris par le déclencheur qui crée la ligne dans `profils`, pour
          // conserver la casse et les accents choisis.
          options: { data: { pseudo: pseudo.trim() } },
        });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password: motDePasse });
        if (error) throw error;
      }
      setMotDePasse("");
    } catch (e) {
      setErreur(traduire(messageErreur(e)));
    } finally {
      setOccupe(false);
    }
  }

  if (!supabaseConfigure) {
    return (
      <Page>
        <EnTetePage titre="Mon compte" />
        <Note ton="alerte">
          La base de données n&apos;est pas configurée sur cette installation. Les calculateurs, le scanner et
          la génétique fonctionnent normalement sans compte — seule la partie ferme est indisponible.
        </Note>
      </Page>
    );
  }

  if (!charge) {
    return (
      <Page>
        <EnTetePage titre="Mon compte" />
        <p className="text-[15px] text-feuille-400">Vérification…</p>
      </Page>
    );
  }

  if (connecte) {
    return (
      <Page>
        <EnTetePage titre="Mon compte" />
        <div className="rounded-lg border border-gene-g/40 bg-gene-g/8 p-5">
          <div className="font-display text-xl font-semibold uppercase tracking-wide text-gene-g">
            Connecté
          </div>
          <p className="mt-1 text-[15px] text-feuille-200">
            {profil?.pseudo
              ? `Tes coéquipiers te voient sous le nom ${profil.pseudo}.`
              : "Compte actif."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/ferme" className="bouton bouton-primaire">
              Aller à ma ferme
            </Link>
            <button type="button" className="bouton" onClick={() => void deconnexion()}>
              Se déconnecter
            </button>
          </div>
        </div>

        <div className="mt-10">
          <Details titre="Supprimer mon compte">
            <p className="text-[14px] leading-relaxed text-feuille-200">
              La suppression est immédiate et définitive : ton compte, tes appartenances et tout ce qui te
              signe dans les fermes disparaissent. Aucune archive, aucune corbeille.
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
              Une ferme dont tu es propriétaire n&apos;est pas détruite si d&apos;autres membres y sont : elle
              est transmise au plus ancien d&apos;entre eux. Elle n&apos;est supprimée que si tu y es seul.
            </p>
            <button
              type="button"
              className="bouton bouton-danger mt-4"
              disabled={occupe}
              onClick={async () => {
                if (!confirm("Supprimer définitivement ton compte ?\n\nCette action ne peut pas être annulée.")) return;
                if (!confirm("Dernière confirmation : tout sera effacé.")) return;
                setOccupe(true);
                try {
                  await supprimerMonCompte();
                  window.location.href = "/";
                } catch (e) {
                  setErreur(traduire(messageErreur(e)));
                  setOccupe(false);
                }
              }}
            >
              Supprimer mon compte
            </button>
          </Details>

          <Details titre="Changer de pseudo">
            <p className="text-[14px] leading-relaxed text-feuille-200">
              Ce n&apos;est pas possible : le pseudo est ton identifiant de connexion. Le modifier
              t&apos;empêcherait de te reconnecter. Si tu tiens à en changer, crée un nouveau compte et
              rejoins la ferme avec le code d&apos;invitation.
            </p>
          </Details>
        </div>
      </Page>
    );
  }

  const tropCourt = motDePasse.length > 0 && motDePasse.length < LONGUEUR_MINI;
  const pret = pseudoValable(pseudo) && motDePasse.length >= LONGUEUR_MINI;

  return (
    <Page>
      <EnTetePage
        titre="Mon compte"
        intro="Un pseudo, un mot de passe, c'est tout. Aucun e-mail demandé, aucun message envoyé."
      />

      <div className="mb-6">
        <Choix
          valeur={mode}
          onChange={(m) => {
            setMode(m);
            setErreur(null);
          }}
          options={[
            { label: "Créer un compte", valeur: "inscription" as const },
            { label: "Se connecter", valeur: "connexion" as const },
          ]}
        />
      </div>

      <div className="space-y-4 panneau">
        <Champ
          label="Pseudo"
          aide={
            mode === "inscription"
              ? "C'est ce que verront tes coéquipiers, et ton identifiant de connexion."
              : undefined
          }
        >
          <input
            className="champ"
            maxLength={32}
            autoComplete="username"
            placeholder="Thomas"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
          />
        </Champ>

        <Champ label="Mot de passe" aide={`${LONGUEUR_MINI} caractères minimum.`}>
          <input
            type="password"
            autoComplete={mode === "inscription" ? "new-password" : "current-password"}
            className="champ"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pret) void valider();
            }}
          />
        </Champ>

        {tropCourt && (
          <p className="font-mono text-[12px] text-mur">
            Encore {LONGUEUR_MINI - motDePasse.length} caractère
            {LONGUEUR_MINI - motDePasse.length > 1 ? "s" : ""}.
          </p>
        )}

        {pseudo.trim().length > 0 && !pseudoValable(pseudo) && (
          <p className="font-mono text-[12px] text-mur">
            Il faut au moins deux lettres ou chiffres.
          </p>
        )}

        <button
          type="button"
          className="bouton bouton-primaire"
          disabled={occupe || !pret}
          onClick={() => void valider()}
        >
          {occupe ? "…" : mode === "inscription" ? "Créer mon compte" : "Se connecter"}
        </button>
      </div>

      {erreur && (
        <div className="mt-4">
          <Note ton="alerte">{erreur}</Note>
        </div>
      )}

      <div className="mt-10">
        <Details titre="Note bien ton mot de passe">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Comme il n&apos;y a pas d&apos;adresse e-mail,{" "}
            <span className="text-feuille-100">un mot de passe oublié ne peut pas être récupéré</span>. Le compte
            serait perdu, et pour un propriétaire, la ferme avec.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            C&apos;est le prix de la simplicité que tu vois ici. Le jour où ça devient gênant, on pourra
            proposer d&apos;ajouter une adresse de secours, en option — sans rien changer aux comptes
            existants.
          </p>
        </Details>

        <Details titre="Pourquoi un compte">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Une ferme est partagée : il faut savoir qui est qui. Les timers, les graines et les récoltes
            appartiennent à la ferme et non à un navigateur — c&apos;est ce qui permet à ton coéquipier de voir
            le décompte que tu as lancé.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Le reste du site n&apos;a pas changé : génétique, scanner, thés et coût de raid restent utilisables
            sans compte, stockés uniquement dans ton navigateur.
          </p>
        </Details>
      </div>
    </Page>
  );
}

/** Les messages de Supabase sont en anglais et parlent d'e-mail, ce qui n'aurait
 *  aucun sens ici. */
function traduire(m: string): string {
  if (m.includes("Invalid login credentials")) {
    return "Pseudo ou mot de passe incorrect.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Ce pseudo est déjà pris. Choisis-en un autre, ou bascule sur « Se connecter ».";
  }
  if (m.includes("Password should be at least")) {
    return `Mot de passe trop court : ${LONGUEUR_MINI} caractères minimum.`;
  }
  if (m.includes("Email not confirmed")) {
    return "La confirmation par e-mail est encore active dans Supabase. Désactive « Confirm email » dans Authentication → Sign In / Providers → Email.";
  }
  // Supabase formule ce refus de plusieurs façons selon la version :
  // « Email signups are disabled », « Signups not allowed for this instance »,
  // « signup is disabled ». On teste la forme plutôt qu'une chaîne exacte.
  if (/sign\s?ups?/i.test(m) && /disabled|not allowed/i.test(m)) {
    return "Les inscriptions sont désactivées côté Supabase. Authentication → Sign In / Providers → Email : active « Enable Email provider » ET « Allow new users to sign up ».";
  }
  if (m.includes("is invalid") && m.includes("email")) {
    return "Ce pseudo ne peut pas être utilisé. Essaie avec des lettres et des chiffres.";
  }
  return m;
}
