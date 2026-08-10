"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Champ, Details, Note } from "@/components/Ui";
import { IconePlante } from "@/components/IconePlante";
import { PLANTES, type PlanteId } from "@/data/game";
import { modifierProfil } from "@/lib/compte";
import { messageErreur, supabase } from "@/lib/supabase";

/**
 * Le profil que l'on montre.
 *
 * Trois choix tenus ici, chacun pour une raison :
 *
 * - **Le pseudo ne change pas.** C'est l'identifiant de connexion, et sans
 *   adresse e-mail c'est la seule chose qui rattache un compte à quelqu'un. Le
 *   nom affiché se pose par-dessus.
 * - **Les avatars sont choisis dans une liste fermée**, pas téléversés. Dès
 *   qu'on accepte un fichier, on hérite d'un devoir de modération et du risque
 *   qu'on y mette n'importe quoi — un coût qu'un projet à une personne ne peut
 *   pas porter.
 * - **Le profil est privé par défaut.** Le site promet que rien n'est visible
 *   de l'extérieur : le rendre public sans demander serait un manquement.
 */

const AVATARS: PlanteId[] = PLANTES.map((p) => p.id);

interface Profil {
  pseudo: string;
  nom_affiche: string | null;
  bio: string | null;
  avatar: string | null;
  profil_public: boolean;
}

export function ProfilPublic() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [nom, setNom] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const sb = supabase();
    if (!sb) return;
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return;
    const { data } = await sb
      .from("profils")
      .select("pseudo, nom_affiche, bio, avatar, profil_public")
      .eq("id", u.user.id)
      .maybeSingle();
    const p = data as Profil | null;
    if (!p) return;
    setProfil(p);
    setNom(p.nom_affiche ?? "");
    setBio(p.bio ?? "");
    setAvatar(p.avatar);
    setVisible(p.profil_public);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (!profil) return null;

  const modifie =
    nom !== (profil.nom_affiche ?? "") ||
    bio !== (profil.bio ?? "") ||
    avatar !== profil.avatar ||
    visible !== profil.profil_public;

  async function enregistrer() {
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      await modifierProfil({
        nomAffiche: nom.trim() || undefined,
        bio,
        avatar: avatar ?? undefined,
        public: visible,
      });
      await charger();
      setMessage("Profil enregistré.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <Details titre="Mon profil" ouvert>
      <div className="flex flex-wrap items-center gap-4">
        <span className="fente h-16 w-16 shrink-0">
          {avatar ? (
            <IconePlante plante={avatar as PlanteId} taille={44} />
          ) : (
            <span className="chiffre text-2xl text-poussiere">
              {profil.pseudo.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <div className="font-display text-xl font-bold text-craie">
            {nom.trim() || profil.pseudo}
          </div>
          <div className="font-mono text-[13px] text-poussiere">@{profil.pseudo}</div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <Champ
          label="Nom affiché"
          aide="Ce que voient les autres. Ton identifiant de connexion, lui, ne change pas."
        >
          <input
            className="champ"
            maxLength={24}
            placeholder={profil.pseudo}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
          />
        </Champ>

        <Champ label="Avatar" aide="Une liste fermée : pas d'image à envoyer, donc rien à modérer.">
          <div className="rangee">
            {AVATARS.map((id) => (
              <button
                key={id}
                type="button"
                aria-label={`Avatar ${id}`}
                onClick={() => setAvatar(id)}
                className={`fente h-11 w-11 transition ${
                  avatar === id ? "border-rouille" : "hover:border-trait-vif"
                }`}
              >
                <IconePlante plante={id} taille={28} />
              </button>
            ))}
          </div>
        </Champ>

        <Champ label={`Bio · ${bio.length} / 280`}>
          <textarea
            className="champ min-h-[5rem] resize-y"
            maxLength={280}
            placeholder="Farmeur du dimanche, spécialiste du chanvre."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </Champ>

        <label className="flex items-start gap-3 rounded-sm border border-trait bg-case p-3.5">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-rouille"
          />
          <span className="text-[14px] leading-snug text-cendre">
            <span className="text-craie">Rendre mon profil visible par tous.</span> Ton nom, ton avatar,
            ta bio, ta date d&apos;inscription et ton nombre de wipes deviennent consultables à
            l&apos;adresse{" "}
            <span className="font-mono text-poussiere">/u/{profil.pseudo}</span>. Décoché, seuls tes
            coéquipiers te voient.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="bouton bouton-primaire"
            disabled={occupe || !modifie}
            onClick={() => void enregistrer()}
          >
            {occupe ? "…" : modifie ? "Enregistrer" : "À jour"}
          </button>
          {profil.profil_public && (
            <Link href={`/u/${profil.pseudo}`} className="bouton">
              Voir ma page
            </Link>
          )}
          {message && <span className="font-mono text-[13px] text-gene-g">{message}</span>}
        </div>

        {erreur && <Note ton="alerte">{erreur}</Note>}
      </div>
    </Details>
  );
}
