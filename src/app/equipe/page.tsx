"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Champ, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { CodeMasque } from "@/components/CodeMasque";
import {
  changerRole,
  creerFerme,
  peutEcrire,
  regenererCode,
  rejoindreFerme,
  retirerMembre,
  useDetailFerme,
  useFermes,
  useSession,
  type RoleFerme,
} from "@/lib/compte";
import { messageErreur, supabaseConfigure } from "@/lib/supabase";
import { useStockage } from "@/lib/storage";

const LIBELLE_ROLE: Record<RoleFerme, string> = {
  proprietaire: "Propriétaire",
  membre: "Membre",
  lecture: "Lecture seule",
};

export default function PageFerme() {
  const { connecte, charge: sessionChargee } = useSession();
  const { fermes, charge, recharger } = useFermes();
  // La ferme courante est retenue localement : c'est un choix d'affichage, pas
  // une donnée de la ferme.
  const [fermeActive, setFermeActive] = useStockage<string | null>("ferme-active", null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [codeAffiche, setCodeAffiche] = useState<string | null>(null);

  const [nomFerme, setNomFerme] = useState("");
  const [nomWipe, setNomWipe] = useState("");
  const [code, setCode] = useState("");

  const courante = fermes.find((f) => f.ferme.id === fermeActive) ?? fermes[0] ?? null;
  useEffect(() => setCodeAffiche(null), [courante?.ferme.id]);
  const { membres, wipe, recharger: rechargerDetail } = useDetailFerme(courante?.ferme.id ?? null);

  // Si la ferme retenue n'existe plus, on retombe sur la première disponible.
  useEffect(() => {
    if (charge && fermeActive && !fermes.some((f) => f.ferme.id === fermeActive)) {
      setFermeActive(fermes[0]?.ferme.id ?? null);
    }
  }, [charge, fermeActive, fermes, setFermeActive]);

  async function agir(action: () => Promise<unknown>) {
    setOccupe(true);
    setErreur(null);
    try {
      await action();
      await recharger();
      await rechargerDetail();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(false);
    }
  }

  if (!supabaseConfigure) {
    return (
      <Page>
        <EnTetePage titre="Équipe" />
        <Note ton="alerte">
          La base de données n&apos;est pas configurée sur cette installation. Le reste du site fonctionne
          normalement.
        </Note>
      </Page>
    );
  }

  if (!sessionChargee) {
    return (
      <Page>
        <EnTetePage titre="Équipe" />
        <p className="text-[15px] text-moss-400">Chargement…</p>
      </Page>
    );
  }

  if (!connecte) {
    return (
      <Page>
        <EnTetePage
          titre="Équipe"
          intro="Une ferme se partage avec tes coéquipiers : timers communs, graines communes, statistiques communes."
        />
        <div className="rounded-lg border border-soil-600 bg-soil-850 p-6 text-center">
          <p className="text-[15px] text-moss-200">Il faut être connecté pour créer ou rejoindre une ferme.</p>
          <Link href="/connexion" className="bouton bouton-primaire mt-4 inline-flex">
            Créer un compte ou se connecter
          </Link>
          <p className="mt-3 text-[13px] text-moss-400">
            Le reste du site reste utilisable sans compte.
          </p>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <EnTetePage titre="Équipe" />

      {erreur && (
        <div className="mb-6">
          <Note ton="alerte">{erreur}</Note>
        </div>
      )}

      {/* Sélecteur, si plusieurs fermes */}
      {fermes.length > 1 && (
        <div className="mb-6">
          <Champ label="Ferme">
            <select
              className="champ max-w-xs"
              value={courante?.ferme.id ?? ""}
              onChange={(e) => setFermeActive(e.target.value)}
            >
              {fermes.map((f) => (
                <option key={f.ferme.id} value={f.ferme.id}>
                  {f.ferme.nom}
                </option>
              ))}
            </select>
          </Champ>
        </div>
      )}

      {courante ? (
        <>
          <section className="rounded-lg border border-soil-600 bg-soil-850 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="titre text-2xl">{courante.ferme.nom}</h2>
              <span className="puce border-lamp/50 text-lamp-glow">{LIBELLE_ROLE[courante.role]}</span>
            </div>

            {wipe ? (
              <p className="mt-2 font-mono text-[13px] text-moss-400">
                {wipe.nom}
                {wipe.serveur && ` · ${wipe.serveur}`} · jour{" "}
                {Math.max(
                  1,
                  Math.floor((Date.now() - new Date(wipe.debut).getTime()) / 86_400_000) + 1
                )}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-ripe">Aucun wipe actif.</p>
            )}
          </section>

          {/* Membres */}
          <section className="mt-8">
            <h3 className="titre mb-3 text-xl">
              Membres <span className="font-mono text-sm font-normal text-moss-400">{membres.length}</span>
            </h3>
            <ul className="space-y-1.5">
              {membres.map((m) => (
                <li
                  key={m.profil_id}
                  className="flex flex-wrap items-center gap-3 rounded border border-soil-600 bg-soil-850 px-3 py-2.5"
                >
                  <span className="text-[15px] text-moss-100">{m.profils?.pseudo ?? "Fermier"}</span>
                  {courante.role === "proprietaire" && m.role !== "proprietaire" ? (
                    <select
                      className="champ ml-auto w-auto py-1 text-[13px]"
                      value={m.role}
                      disabled={occupe}
                      onChange={(e) =>
                        void agir(() =>
                          changerRole(courante.ferme.id, m.profil_id, e.target.value as RoleFerme)
                        )
                      }
                    >
                      <option value="membre">Membre</option>
                      <option value="lecture">Lecture seule</option>
                    </select>
                  ) : (
                    <span className="ml-auto font-mono text-[12px] text-moss-400">
                      {LIBELLE_ROLE[m.role]}
                    </span>
                  )}
                  {courante.role === "proprietaire" && m.role !== "proprietaire" && (
                    <button
                      type="button"
                      className="font-mono text-[11px] uppercase tracking-wider text-moss-400 hover:text-gene-w"
                      disabled={occupe}
                      onClick={() => {
                        if (confirm(`Retirer ${m.profils?.pseudo ?? "ce membre"} de la ferme ?`)) {
                          void agir(() => retirerMembre(courante.ferme.id, m.profil_id));
                        }
                      }}
                    >
                      Retirer
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Invitation */}
          {courante.role === "proprietaire" && (
            <section className="mt-8 rounded-lg border border-soil-600 bg-soil-850 p-5">
              <h3 className="titre text-xl">Inviter un coéquipier</h3>
              <p className="mt-1 text-[14px] text-moss-400">
                Donne-lui ce code. Il le saisit dans « Rejoindre une ferme » après s&apos;être connecté.
              </p>
              <div className="mt-4">
                <CodeMasque code={courante.ferme.code_invitation} />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="bouton bouton-danger"
                  disabled={occupe}
                  onClick={() => {
                    if (confirm("Régénérer le code ? L'ancien cessera de fonctionner.")) {
                      void agir(() => regenererCode(courante.ferme.id));
                    }
                  }}
                >
                  {occupe ? "…" : "Régénérer"}
                </button>
                <span className="text-[13px] text-moss-400">
                  L&apos;ancien code cessera immédiatement de fonctionner.
                </span>
              </div>

              <p className="mt-4 text-[13px] leading-relaxed text-moss-400">
                Le code est masqué par défaut : quiconque le voit peut rejoindre la ferme, et une seconde à
                l&apos;image en direct suffit à le faire fuiter. Il se remasque tout seul après quelques
                secondes, et la copie fonctionne sans avoir à le révéler.
              </p>
            </section>
          )}
        </>
      ) : (
        charge && (
          <Note>Tu n&apos;as pas encore de ferme. Crée la tienne, ou rejoins celle d&apos;un coéquipier.</Note>
        )
      )}

      {/* Créer / rejoindre */}
      <div className="mt-10">
        <Details titre="Créer une ferme" ouvert={fermes.length === 0}>
          <div className="space-y-4">
            <Champ label="Nom de la ferme">
              <input
                className="champ"
                placeholder="Team Alpha"
                value={nomFerme}
                onChange={(e) => setNomFerme(e.target.value)}
              />
            </Champ>
            <Champ label="Nom du wipe" aide="Modifiable plus tard.">
              <input
                className="champ"
                placeholder="Wipe 1"
                value={nomWipe}
                onChange={(e) => setNomWipe(e.target.value)}
              />
            </Champ>
            <button
              type="button"
              className="bouton bouton-primaire"
              disabled={occupe || nomFerme.trim().length === 0}
              onClick={() =>
                void agir(async () => {
                  const id = await creerFerme(nomFerme, nomWipe);
                  setFermeActive(id);
                  setNomFerme("");
                  setNomWipe("");
                })
              }
            >
              Créer
            </button>
          </div>
        </Details>

        <Details titre="Rejoindre une ferme">
          <div className="flex flex-wrap items-end gap-3">
            <Champ label="Code d'invitation">
              <input
                className="champ font-mono tracking-[0.2em]"
                placeholder="a1b2c3d4"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Champ>
            <button
              type="button"
              className="bouton bouton-primaire"
              disabled={occupe || code.trim().length < 4}
              onClick={() =>
                void agir(async () => {
                  const id = await rejoindreFerme(code);
                  setFermeActive(id);
                  setCode("");
                })
              }
            >
              Rejoindre
            </button>
          </div>
        </Details>

        <Details titre="Les trois rôles">
          <ul className="space-y-2 text-[14px] leading-relaxed text-moss-200">
            <li>
              <span className="text-moss-100">Propriétaire</span> — gère la ferme, les membres, les rôles et
              les wipes.
            </li>
            <li>
              <span className="text-moss-100">Membre</span> — ajoute des graines, lance des timers, enregistre
              des récoltes, modifie les plantations.
            </li>
            <li>
              <span className="text-moss-100">Lecture seule</span> — consulte tout, ne modifie rien.
            </li>
          </ul>
          <p className="mt-3 text-[13px] leading-relaxed text-moss-400">
            Ces règles sont appliquées par la base de données elle-même, pas par l&apos;interface. Masquer un
            bouton n&apos;empêche personne d&apos;appeler l&apos;API directement — c&apos;est pour ça
            qu&apos;elles ne vivent pas dans le code du site.
          </p>
        </Details>
      </div>

      {courante && !peutEcrire(courante.role) && (
        <div className="mt-6">
          <Note>
            Tu es en lecture seule sur cette ferme. Tu vois tout, tu ne modifies rien.
          </Note>
        </div>
      )}
    </Page>
  );
}
