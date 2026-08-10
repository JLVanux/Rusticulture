"use client";

import { useState } from "react";
import Link from "next/link";
import { ChaineGenes } from "@/components/Genes";
import { Champ, Details, EnTetePage, Note, Page } from "@/components/Ui";
import { VoirAussi } from "@/components/VoirAussi";
import { formatNombre } from "@/lib/model";
import { useResumeWipe, useWipes, type WipeComplet } from "@/lib/wipes";

export default function PageWipes() {
  const { wipes, ferme, estProprietaire, charge, erreur, cloturer, demarrer, rouvrir } = useWipes();
  const [nom, setNom] = useState("");
  const [serveur, setServeur] = useState("");
  const [nbJoueurs, setNbJoueurs] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const actif = wipes.find((w) => w.actif) ?? null;
  const archives = wipes.filter((w) => !w.actif);

  if (!ferme) {
    return (
      <Page large>
        <EnTetePage titre="Wipes" />
        <div className="verre rampe p-6 text-center">
          <p className="text-[15px] text-feuille-200">Un wipe appartient à une ferme.</p>
          <Link href="/equipe" className="bouton bouton-primaire mt-4 inline-flex">
            Créer une ferme
          </Link>
        </div>
      </Page>
    );
  }

  async function demarrerNouveau() {
    if (!nom.trim()) return;
    setOccupe(true);
    await demarrer(nom, serveur, nbJoueurs ? Number(nbJoueurs) : null);
    setNom("");
    setServeur("");
    setNbJoueurs("");
    setOccupe(false);
  }

  return (
    <Page>
      <EnTetePage
        titre="Wipes"
        intro="Clôturer un wipe n'efface rien : il cesse d'être actif et reste consultable."
      />

      {erreur && (
        <div className="mb-6">
          <Note ton="alerte">{traduireErreur(erreur)}</Note>
        </div>
      )}

      {!charge ? (
        <p className="text-[15px] text-feuille-400">Chargement…</p>
      ) : (
        <>
          {/* En cours */}
          <section>
            <h2 className="titre mb-3 text-xl">En cours</h2>
            {actif ? (
              <div className="rounded-lg border border-lampe/50 bg-lampe/8 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-display text-2xl font-bold uppercase tracking-wide text-lampe-chaud">
                    {actif.nom}
                  </span>
                  <span className="font-mono text-[13px] text-feuille-400">
                    jour {jourDe(actif)}
                    {actif.serveur && ` · ${actif.serveur}`}
                    {actif.nbJoueurs && ` · ${actif.nbJoueurs} joueurs`}
                  </span>
                </div>

                {estProprietaire && (
                  <button
                    type="button"
                    className="bouton bouton-danger mt-4"
                    disabled={occupe}
                    onClick={() => {
                      if (
                        confirm(
                          `Clôturer « ${actif.nom} » ?\n\nRien n'est effacé : le wipe restera consultable avec son résumé. Mais tes graines, bacs, minuteurs et récoltes n'apparaîtront plus dans le site tant qu'un nouveau wipe n'aura pas démarré.`
                        )
                      ) {
                        void cloturer(actif.id);
                      }
                    }}
                  >
                    Clôturer ce wipe
                  </button>
                )}
              </div>
            ) : (
              <Note ton="alerte">
                Aucun wipe actif. Le site n&apos;a nulle part où ranger tes graines, tes bacs et tes minuteurs
                tant que tu n&apos;en démarres pas un.
              </Note>
            )}
          </section>

          {/* Démarrer */}
          {estProprietaire && (
            <section className="mt-8">
              <Details titre="Démarrer un nouveau wipe" ouvert={!actif}>
                <p className="mb-4 text-[14px] leading-relaxed text-feuille-400">
                  Le wipe en cours sera clôturé automatiquement. Tout repart de zéro : graines, bacs,
                  minuteurs, récoltes et objectifs. L&apos;ancien reste consultable ici.
                </p>
                <div className="space-y-4">
                  <Champ label="Nom du wipe">
                    <input
                      className="champ"
                      placeholder="Wipe de septembre"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && nom.trim()) void demarrerNouveau();
                      }}
                    />
                  </Champ>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[12rem] flex-1">
                      <Champ label="Serveur (facultatif)">
                        <input
                          className="champ"
                          placeholder="Rustoria EU Main"
                          value={serveur}
                          onChange={(e) => setServeur(e.target.value)}
                        />
                      </Champ>
                    </div>
                    <div className="w-32">
                      <Champ label="Joueurs">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          className="champ"
                          value={nbJoueurs}
                          onChange={(e) => setNbJoueurs(e.target.value)}
                        />
                      </Champ>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="bouton bouton-primaire"
                    disabled={occupe || !nom.trim()}
                    onClick={() => void demarrerNouveau()}
                  >
                    {occupe ? "…" : "Démarrer"}
                  </button>
                </div>
              </Details>
            </section>
          )}

          {/* Archives */}
          {archives.length > 0 && (
            <section className="mt-10">
              <h2 className="titre mb-3 text-xl">Wipes passés</h2>
              <ul className="space-y-2">
                {archives.map((w) => (
                  <li key={w.id} className="verre rampe p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-display text-lg font-semibold uppercase tracking-wide text-feuille-100">
                        {w.nom}
                      </span>
                      <span className="font-mono text-[12px] text-feuille-400">
                        {formatDate(w.debut)}
                        {w.fin && ` → ${formatDate(w.fin)}`}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="bouton"
                        onClick={() => setOuvert(ouvert === w.id ? null : w.id)}
                      >
                        {ouvert === w.id ? "Masquer le résumé" : "Voir le résumé"}
                      </button>
                      {estProprietaire && !actif && (
                        <button
                          type="button"
                          className="bouton"
                          onClick={() => {
                            if (confirm(`Rouvrir « ${w.nom} » comme wipe actif ?`)) void rouvrir(w.id);
                          }}
                        >
                          Rouvrir
                        </button>
                      )}
                    </div>

                    {ouvert === w.id && <Resume wipeId={w.id} />}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="mt-10">
        <Details titre="Ce que change une clôture">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Rien n&apos;est supprimé. Les graines, bacs, minuteurs, récoltes et objectifs restent attachés au
            wipe clôturé et alimentent son résumé. Ils cessent simplement d&apos;apparaître dans le tableau de
            bord, les statistiques et les outils, qui ne montrent que le wipe actif.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-feuille-200">
            Un wipe clôturé par erreur se rouvre, à condition qu&apos;aucun autre ne soit actif — le site
            refuse d&apos;en clôturer un dans ton dos.
          </p>
        </Details>

        <Details titre="Pourquoi le résumé n'est pas figé">
          <p className="text-[14px] leading-relaxed text-feuille-200">
            Il est recalculé à chaque affichage à partir des faits enregistrés. Rouvrir un wipe et y ajouter
            une récolte oubliée met le résumé à jour tout seul. Un total figé au moment de la clôture aurait
            fini par ne plus correspondre à ses propres données.
          </p>
        </Details>
      </div>
      <VoirAussi
        liens={[
          { href: "/statistiques", label: "Statistiques", detail: "Le détail du wipe en cours." },
          { href: "/ferme", label: "Ma ferme", detail: "La configuration et les objectifs." },
        ]}
      />

    </Page>
  );
}

function Resume({ wipeId }: { wipeId: string }) {
  const { resume, charge } = useResumeWipe(wipeId);

  if (!charge) return <p className="mt-4 text-[14px] text-feuille-400">Calcul…</p>;
  if (!resume) return null;

  const rien = resume.totaux.length === 0 && resume.nombreGraines === 0;

  return (
    <div className="mt-4 border-t border-white/[0.07] pt-4">
      {rien ? (
        <p className="text-[14px] text-feuille-400">Aucune donnée enregistrée sur ce wipe.</p>
      ) : (
        <>
          <ul className="space-y-1">
            {resume.totaux.map((t) => (
              <li key={t.ressource} className="flex items-baseline justify-between gap-3">
                <span className="text-[14px] text-feuille-200">{t.ressource}</span>
                <span className="font-mono text-[15px] font-bold text-feuille-100">
                  {formatNombre(t.total, 0)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/[0.07] pt-3">
            <Bloc label="Durée" valeur={`${resume.jours} j`} />
            <Bloc label="Récoltes" valeur={String(resume.nombreRecoltes)} />
            {resume.meilleureRecolte && (
              <Bloc
                label="Meilleure récolte"
                valeur={`${formatNombre(resume.meilleureRecolte.quantite, 0)} ${resume.meilleureRecolte.ressource}`}
              />
            )}
            <Bloc label="Graines" valeur={String(resume.nombreGraines)} />
            <Bloc label="Plants déclarés" valeur={String(resume.plantsDeclares)} />
            {resume.objectifsTotal > 0 && (
              <Bloc
                label="Objectifs cochés"
                valeur={`${resume.objectifsAtteints} / ${resume.objectifsTotal}`}
              />
            )}
          </dl>

          {resume.meilleursGenes && (
            <div className="mt-4 border-t border-white/[0.07] pt-3">
              <div className="eyebrow mb-1.5">Meilleurs gènes obtenus</div>
              <ChaineGenes genome={resume.meilleursGenes} taille="md" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Bloc({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="font-mono text-lg text-feuille-100">{valeur}</dd>
    </div>
  );
}

function jourDe(w: WipeComplet): number {
  return Math.max(1, Math.floor((Date.now() - new Date(w.debut).getTime()) / 86_400_000) + 1);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function traduireErreur(m: string): string {
  if (m.includes("deja actif")) {
    return "Un wipe est déjà actif sur cette ferme. Clôture-le avant d'en rouvrir un autre.";
  }
  if (m.includes("droits insuffisants") || m.includes("row-level security")) {
    return "Seul le propriétaire de la ferme peut gérer les wipes.";
  }
  if (m.includes("introuvable")) return "Ce wipe n'existe plus.";
  return m;
}
