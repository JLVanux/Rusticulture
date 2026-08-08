"use client";

import { useMemo, useState } from "react";
import { Champ, Note } from "@/components/Ui";
import type { LigneProduction } from "@/lib/plantations";
import { evaluerPlausibilite, RESSOURCES, type Recolte } from "@/lib/recoltes";

/**
 * Saisie d'une récolte réelle.
 *
 * Le contrôle de plausibilité s'affiche pendant la saisie, pas après : une fois
 * la récolte enregistrée, l'avertissement arriverait trop tard et donnerait
 * l'impression d'un reproche plutôt que d'une aide.
 *
 * Il avertit sans jamais bloquer. Refuser une récolte légitime — un stock
 * accumulé, des bacs non déclarés — serait bien pire que d'en accepter une
 * douteuse.
 */
export function EnregistrerRecolte({
  recoltes,
  production,
  debutWipe,
  onEnregistrer,
}: {
  recoltes: Recolte[];
  production: LigneProduction[];
  debutWipe: number | null;
  onEnregistrer: (ressource: string, quantite: number, note?: string) => Promise<void>;
}) {
  const [ressource, setRessource] = useState(RESSOURCES[0] ?? "tissu");
  const [quantite, setQuantite] = useState("");
  const [note, setNote] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);

  const nombre = Number(quantite);
  const valide = Number.isFinite(nombre) && nombre > 0;

  const plausibilite = useMemo(
    () => (valide ? evaluerPlausibilite(ressource, nombre, recoltes, production, debutWipe) : null),
    [valide, ressource, nombre, recoltes, production, debutWipe]
  );

  async function enregistrer() {
    if (!valide) return;
    setOccupe(true);
    await onEnregistrer(ressource, Math.round(nombre), note);
    setQuantite("");
    setNote("");
    setSucces(`${Math.round(nombre)} ${ressource} enregistrés.`);
    setTimeout(() => setSucces(null), 3000);
    setOccupe(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Champ label="Quantité">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className="champ"
              placeholder="1842"
              value={quantite}
              onChange={(e) => setQuantite(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && valide) void enregistrer();
              }}
            />
          </Champ>
        </div>
        <div className="min-w-[9rem]">
          <Champ label="Ressource">
            <select className="champ" value={ressource} onChange={(e) => setRessource(e.target.value)}>
              {RESSOURCES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <div className="min-w-[10rem] flex-1">
          <Champ label="Note (facultatif)">
            <input
              className="champ"
              placeholder="après la session du soir"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Champ>
        </div>
        <button
          type="button"
          className="bouton bouton-primaire"
          disabled={!valide || occupe}
          onClick={() => void enregistrer()}
        >
          {occupe ? "…" : "Enregistrer"}
        </button>
      </div>

      {plausibilite?.message && (
        <Note ton={plausibilite.verdict === "impossible" ? "alerte" : "info"}>{plausibilite.message}</Note>
      )}

      {succes && <p className="font-mono text-[13px] text-gene-g">{succes}</p>}
    </div>
  );
}
