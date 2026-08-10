"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Champ, Details } from "@/components/Ui";
import { formatDuree, formatNombre } from "@/lib/model";
import {
  CAPACITE_SORTIE,
  POULES_MAX,
  calculerProductionOeufs,
  useElevage,
  type Elevage,
} from "@/lib/elevage";

export function SectionElevage() {
  const { elevage, modifiable, charge, erreur, enregistrer } = useElevage();
  const [brouillon, setBrouillon] = useState<Elevage>(elevage);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => setBrouillon(elevage), [elevage]);

  const oeufs = calculerProductionOeufs(brouillon);
  const modifie =
    brouillon.poulaillers !== elevage.poulaillers ||
    brouillon.poulesParPoulailler !== elevage.poulesParPoulailler ||
    brouillon.bonheur !== elevage.bonheur;

  if (!charge) return null;

  return (
    <section className="mt-10">
      <h2 className="titre text-2xl">Élevage</h2>
      <p className="mt-1 text-[14px] text-feuille-400">
        Les œufs limitent toutes les tartes. Déclare tes poulaillers pour qu&apos;ils comptent dans ta
        production.
      </p>

      {erreur && <p className="mt-3 font-mono text-[13px] text-gene-w">{erreur}</p>}

      {elevage.poulaillers === 0 && !modifiable ? (
        <p className="mt-4 text-[14px] text-feuille-400">Aucun poulailler déclaré.</p>
      ) : (
        <>
          {oeufs.poules > 0 && (
            <div className="mt-4 verre rampe p-4">
              <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
                <div>
                  <div className="eyebrow">œufs / heure</div>
                  <div className="font-display text-3xl font-bold text-lampe-chaud">
                    {formatNombre(oeufs.parHeure, 0)}
                  </div>
                </div>
                <div>
                  <div className="eyebrow">Poules</div>
                  <div className="font-mono text-lg text-feuille-100">{oeufs.poules}</div>
                </div>
                <div>
                  <div className="eyebrow">Saturation</div>
                  <div className="font-mono text-lg text-feuille-100">
                    {formatDuree(oeufs.minutesAvantSaturation)}
                  </div>
                </div>
              </div>
              <p className="mt-3 border-t border-white/[0.07] pt-3 text-[13px] leading-relaxed text-feuille-400">
                La case de sortie plafonne à {CAPACITE_SORTIE} œufs par poulailler, et la ponte s&apos;arrête
                quand elle est pleine. Passe ramasser toutes les{" "}
                {formatDuree(oeufs.minutesAvantSaturation)}, sinon tu produis dans le vide.
              </p>
            </div>
          )}

          {modifiable && (
            <div className="mt-4">
              <Details titre="Déclarer mon élevage" ouvert={elevage.poulaillers === 0}>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="w-32">
                    <Champ label="Poulaillers">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        className="champ"
                        value={brouillon.poulaillers}
                        onChange={(e) =>
                          setBrouillon({ ...brouillon, poulaillers: Math.max(0, Number(e.target.value)) })
                        }
                      />
                    </Champ>
                  </div>
                  <div className="w-32">
                    <Champ label="Poules / coop">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={POULES_MAX}
                        className="champ"
                        value={brouillon.poulesParPoulailler}
                        onChange={(e) =>
                          setBrouillon({
                            ...brouillon,
                            poulesParPoulailler: Math.min(
                              POULES_MAX,
                              Math.max(1, Number(e.target.value))
                            ),
                          })
                        }
                      />
                    </Champ>
                  </div>
                  <div className="min-w-[12rem] flex-1">
                    <Champ label={`Jauges au vert · ${Math.round(brouillon.bonheur * 100)} %`}>
                      <input
                        type="range"
                        min={0.2}
                        max={1}
                        step={0.1}
                        className="mt-2 w-full"
                        value={brouillon.bonheur}
                        onChange={(e) => setBrouillon({ ...brouillon, bonheur: Number(e.target.value) })}
                      />
                    </Champ>
                  </div>
                </div>

                <button
                  type="button"
                  className="bouton bouton-primaire mt-4"
                  disabled={occupe || !modifie}
                  onClick={async () => {
                    setOccupe(true);
                    await enregistrer(brouillon);
                    setOccupe(false);
                  }}
                >
                  {occupe ? "…" : modifie ? "Enregistrer" : "À jour"}
                </button>

                <p className="mt-3 text-[13px] leading-relaxed text-feuille-400">
                  Quatre poules par poulailler au maximum. Les jauges — faim, soif, soleil, amour — se remplissent
                  en nourrissant et en caressant ; toutes au vert, la ponte est maximale. Le détail est sur la{" "}
                  <Link href="/poulailler" className="text-lampe-chaud underline underline-offset-2">
                    page Poulailler
                  </Link>
                  .
                </p>
              </Details>
            </div>
          )}
        </>
      )}
    </section>
  );
}
