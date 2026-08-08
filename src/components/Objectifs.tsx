"use client";

import { useState } from "react";
import { ChaineGenes, EditeurGenes } from "@/components/Genes";
import { Champ, Choix, Details } from "@/components/Ui";
import type { Genome } from "@/data/game";
import { parseGenome } from "@/lib/crossbreed";
import type { GraineUnifiee } from "@/lib/graines";
import type { Plantation } from "@/lib/plantations";
import { CONTENANTS } from "@/lib/plantations";
import type { Recolte } from "@/lib/recoltes";
import { RESSOURCES } from "@/lib/recoltes";
import {
  calculerProgression,
  MODELES,
  useObjectifs,
  type TypeObjectif,
} from "@/lib/objectifs";

export function SectionObjectifs({
  recoltes,
  graines,
  plantations,
}: {
  recoltes: Recolte[];
  graines: GraineUnifiee[];
  plantations: Plantation[];
}) {
  const { objectifs, modifiable, erreur, ajouter, supprimer, basculerLibre } = useObjectifs();

  const [type, setType] = useState<TypeObjectif>("production");
  const [libelle, setLibelle] = useState("");
  const [ressource, setRessource] = useState(RESSOURCES[0] ?? "tissu");
  const [cible, setCible] = useState("10000");
  const [genes, setGenes] = useState<Genome>(["G", "G", "G", "Y", "Y", "Y"]);

  const contexte = { recoltes, graines, plantations };

  async function ajouterCourant() {
    const nom = libelle.trim();
    if (!nom) return;
    await ajouter({
      libelle: nom,
      type,
      ressource: type === "production" ? ressource : type === "construction" ? ressource : null,
      cible: type === "production" || type === "construction" ? Number(cible) || null : null,
      genes: type === "genetique" ? genes : null,
    });
    setLibelle("");
  }

  return (
    <section className="mt-10">
      <h2 className="titre text-2xl">Objectifs du wipe</h2>
      <p className="mt-1 text-[14px] text-moss-400">
        La progression se calcule à partir de tes récoltes, tes graines et tes bacs. Rien à cocher, sauf pour
        les objectifs libres.
      </p>

      {erreur && <p className="mt-3 font-mono text-[13px] text-gene-w">{erreur}</p>}

      {objectifs.length === 0 ? (
        <p className="mt-4 rounded border border-dashed border-soil-600 p-6 text-center text-[14px] text-moss-400">
          Aucun objectif. Un wipe sans cap, c&apos;est du farm sans raison.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {objectifs.map((o) => {
            const p = calculerProgression(o, contexte);
            return (
              <li
                key={o.id}
                className={`rounded-lg border p-4 ${
                  p.atteint ? "border-gene-g/50 bg-gene-g/8" : "border-soil-600 bg-soil-850"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={`font-display text-[16px] font-semibold uppercase tracking-wide ${
                      p.atteint ? "text-gene-g" : "text-moss-100"
                    }`}
                  >
                    {o.libelle}
                  </span>
                  {o.genes && <ChaineGenes genome={o.genes} taille="sm" />}
                  <span className="ml-auto font-mono text-[13px] text-moss-400">{p.detail}</span>
                  {modifiable && (
                    <button
                      type="button"
                      className="font-mono text-[11px] uppercase tracking-wider text-moss-400 hover:text-gene-w"
                      onClick={() => {
                        if (confirm(`Supprimer « ${o.libelle} » ?`)) void supprimer(o.id);
                      }}
                    >
                      Retirer
                    </button>
                  )}
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-sm bg-soil-700">
                  <span
                    className={`block h-full ${p.atteint ? "bg-gene-g" : "bg-lamp"}`}
                    style={{ width: `${Math.max(1, p.part * 100)}%` }}
                  />
                </div>

                {o.type === "libre" && modifiable && (
                  <label className="mt-3 flex items-center gap-2 text-[14px] text-moss-200">
                    <input
                      type="checkbox"
                      checked={Boolean(o.atteintLe)}
                      onChange={(e) => void basculerLibre(o.id, e.target.checked)}
                      className="h-4 w-4 accent-lamp"
                    />
                    Objectif atteint
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {modifiable && (
        <div className="mt-4">
          <Details titre="Ajouter un objectif" ouvert={objectifs.length === 0}>
            <div className="mb-5 flex flex-wrap gap-1.5">
              {MODELES.map((m) => (
                <button
                  key={m.libelle}
                  type="button"
                  className="rounded border border-soil-600 px-2.5 py-1.5 text-[13px] text-moss-200 transition hover:border-lamp/60 hover:text-moss-100"
                  onClick={() =>
                    void ajouter({
                      libelle: m.libelle,
                      type: m.type,
                      ressource: m.ressource ?? null,
                      cible: m.cible ?? null,
                      genes: m.genes ? parseGenome(m.genes) : null,
                    })
                  }
                >
                  {m.libelle}
                </button>
              ))}
            </div>

            <div className="space-y-4 border-t border-soil-700 pt-4">
              <Champ label="Intitulé">
                <input
                  className="champ"
                  placeholder="Produire 20 000 tissus"
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                />
              </Champ>

              <Champ label="Type">
                <Choix
                  valeur={type}
                  onChange={setType}
                  options={[
                    { label: "Production", valeur: "production" as const },
                    { label: "Génétique", valeur: "genetique" as const },
                    { label: "Construction", valeur: "construction" as const },
                    { label: "Libre", valeur: "libre" as const },
                  ]}
                />
              </Champ>

              {type === "production" && (
                <div className="flex flex-wrap items-end gap-3">
                  <Champ label="Ressource">
                    <select className="champ" value={ressource} onChange={(e) => setRessource(e.target.value)}>
                      {RESSOURCES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Champ>
                  <div className="w-32">
                    <Champ label="Objectif">
                      <input
                        type="number"
                        min={1}
                        className="champ"
                        value={cible}
                        onChange={(e) => setCible(e.target.value)}
                      />
                    </Champ>
                  </div>
                </div>
              )}

              {type === "construction" && (
                <div className="flex flex-wrap items-end gap-3">
                  <Champ label="Contenant">
                    <select className="champ" value={ressource} onChange={(e) => setRessource(e.target.value)}>
                      {CONTENANTS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </Champ>
                  <div className="w-32">
                    <Champ label="Combien">
                      <input
                        type="number"
                        min={1}
                        className="champ"
                        value={cible}
                        onChange={(e) => setCible(e.target.value)}
                      />
                    </Champ>
                  </div>
                </div>
              )}

              {type === "genetique" && (
                <Champ label="Gènes visés">
                  <EditeurGenes genome={genes} onChange={setGenes} taille="md" />
                </Champ>
              )}

              <button
                type="button"
                className="bouton bouton-primaire"
                disabled={!libelle.trim()}
                onClick={() => void ajouterCourant()}
              >
                Ajouter
              </button>
            </div>
          </Details>
        </div>
      )}
    </section>
  );
}
