"use client";

import { EnTetePage, Page } from "@/components/Ui";
import { Modale } from "@/components/Modale";
import { VoirAussi } from "@/components/VoirAussi";
import { CarteBase } from "@/components/CarteBase";
import { publierBase, supprimerBase } from "@/lib/bases";
import { FormulaireBase } from "@/components/FormulaireBase";
import { useState } from "react";
import { TAILLES, useAdmin, useBases, type Base, type TailleBase } from "@/lib/bases";
import { useSession } from "@/lib/compte";

export default function PageBases() {
  const { admin } = useAdmin();
  // Un administrateur voit aussi ce qui attend : modérer là où l'on consulte
  // évite d'avoir deux endroits qui font la même chose.
  const { bases: toutes, charge, recharger } = useBases(true);
  const { connecte } = useSession();
  const [formulaire, setFormulaire] = useState(false);
  const [filtre, setFiltre] = useState<TailleBase | null>(null);
  const [corrige, setCorrige] = useState<Base | null>(null);

  const bases = toutes.filter((b) => b.publiee);
  const enAttente = toutes.filter((b) => !b.publiee);

  const affichees = filtre ? bases.filter((b) => b.taille === filtre) : bases;

  return (
    <Page large>
      <EnTetePage
        titre="Bases de farm"
        intro="Des bases repérées par la communauté, avec ce qu'elles contiennent en bacs et en pots."
      />

      {connecte && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button type="button" className="bouton bouton-primaire" onClick={() => setFormulaire(true)}>
            Proposer une base
          </button>
          <span className="text-[13px] text-poussiere">
            {admin
              ? "Tu es administrateur : ta proposition est publiée immédiatement."
              : "Relue avant publication."}
          </span>
        </div>
      )}

      {/* Ce qui attend une relecture, pour un administrateur seulement. */}
      {admin && enAttente.length > 0 && (
        <section className="mb-10">
          <div className="verre mb-4 border-l-2 border-l-rouille p-4">
            <div className="eyebrow">À relire</div>
            <p className="mt-1 text-[15px] leading-relaxed text-craie">
              {enAttente.length} proposition{enAttente.length > 1 ? "s" : ""} en attente. Corrige ce
              qui doit l&apos;être avant de publier : c&apos;est le seul moment où quelqu&apos;un relit.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enAttente.map((b) => (
              <CarteBase
                key={b.id}
                base={b}
                actions={
                  <>
                    <button
                      type="button"
                      className="bouton bouton-primaire"
                      onClick={async () => {
                        await publierBase(b.id, true);
                        recharger();
                      }}
                    >
                      Publier
                    </button>
                    <button type="button" className="bouton" onClick={() => setCorrige(b)}>
                      Corriger
                    </button>
                    <button
                      type="button"
                      className="bouton bouton-danger"
                      onClick={async () => {
                        if (!confirm(`Refuser « ${b.titre} » ? La proposition sera supprimée.`)) return;
                        await supprimerBase(b.id);
                        recharger();
                      }}
                    >
                      Refuser
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Toujours visible dès qu'il y a une base. Le masquer en dessous d'un
          seuil paraissait malin ; en pratique on ne pouvait tout simplement pas
          filtrer, et rien n'indiquait que c'était possible. */}
      {bases.length > 0 && (
        <div className="rangee mb-5">
          <button
            type="button"
            onClick={() => setFiltre(null)}
            className={`min-h-[2.5rem] rounded-sm border px-3.5 font-display text-[13px] font-semibold transition ${
              filtre === null
                ? "border-rouille bg-rouille/15 text-braise"
                : "border-trait text-cendre hover:border-trait-vif hover:text-craie"
            }`}
          >
            Toutes
            <span className="ml-2 font-mono text-[11px] opacity-70">{bases.length}</span>
          </button>
          {TAILLES.map((t) => {
            const n = bases.filter((b) => b.taille === t.id).length;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setFiltre((prec) => (prec === t.id ? null : t.id))}
                disabled={n === 0}
                className={`min-h-[2.5rem] rounded-sm border px-3.5 font-display text-[13px] font-semibold transition disabled:opacity-35 ${
                  filtre === t.id
                    ? "border-rouille bg-rouille/15 text-braise"
                    : "border-trait text-cendre hover:border-trait-vif hover:text-craie"
                }`}
              >
                {t.nom}
                <span className="ml-2 font-mono text-[11px] opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {!charge ? (
        <p className="text-[15px] text-cendre">Chargement…</p>
      ) : affichees.length === 0 ? (
        <div className="rounded-sm border border-dashed border-trait p-10 text-center">
          <p className="text-[15px] text-cendre">
            {filtre ? "Aucune base pour cette taille d'équipe." : "Aucune base pour l'instant."}
          </p>
          <p className="mt-1 text-[13px] text-poussiere">
            {filtre
              ? "Essaie une autre taille, ou propose la première."
              : connecte
                ? "Propose la première."
                : "Connecte-toi pour en proposer une."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {affichees.map((b) => (
            <CarteBase
              key={b.id}
              base={b}
              actions={
                admin ? (
                  <>
                    <button type="button" className="bouton" onClick={() => setCorrige(b)}>
                      Corriger
                    </button>
                    <button
                      type="button"
                      className="bouton bouton-danger"
                      onClick={async () => {
                        if (!confirm(`Retirer « ${b.titre} » du répertoire ?`)) return;
                        await supprimerBase(b.id);
                        recharger();
                      }}
                    >
                      Retirer
                    </button>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      <Modale titre="Proposer une base" ouverte={formulaire} onFermer={() => setFormulaire(false)}>
        <p className="mb-4 text-[14px] leading-relaxed text-cendre">
          {admin
            ? "Ta proposition est publiée immédiatement."
            : "Ta proposition sera relue avant d'apparaître : un répertoire sans relecture devient une décharge en quelques jours."}
        </p>
        <FormulaireBase
          admin={admin}
          onAjout={() => {
            recharger();
            setFormulaire(false);
          }}
        />
      </Modale>

      <Modale titre="Corriger la base" ouverte={corrige !== null} onFermer={() => setCorrige(null)}>
        {corrige && (
          <FormulaireBase
            admin
            base={corrige}
            onAjout={() => {
              recharger();
              setCorrige(null);
            }}
          />
        )}
      </Modale>

      <VoirAussi
        liens={[
          {
            href: "/ferme",
            label: "Ma ferme",
            detail: "Déclare tes bacs pour connaître ta production.",
          },
          {
            href: "/rendement",
            label: "Rendement",
            detail: "Ce qu'un nombre de bacs donné peut rapporter.",
          },
        ]}
      />
    </Page>
  );
}
