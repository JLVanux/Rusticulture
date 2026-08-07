"use client";

import type { Genome, PlanteId } from "@/data/game";
import { PLANTES } from "@/data/game";
import { formatGenome, parseGenome } from "@/lib/crossbreed";

// -----------------------------------------------------------------------------
// Permaliens
//
// Tout l'état d'un plan tient dans l'URL, ce qui permet de coller un lien dans
// un salon Discord et que la personne en face voie exactement le même écran.
//
// On écrit dans le fragment (#) plutôt que dans la requête (?) : le fragment
// n'est jamais transmis au serveur, ne perturbe pas le rendu statique de
// Next.js, et se met à jour sans recharger la page.
//
// Format volontairement lisible plutôt que compressé — on doit pouvoir
// comprendre un lien d'un coup d'œil et le corriger à la main :
//   #p=chanvre&c=GGGYYY&g=GGGYYWx2,GGXYYY,WGGYYY
// -----------------------------------------------------------------------------

export interface EtatPartage {
  plante: PlanteId;
  cible: Genome;
  graines: { genome: Genome; quantite: number }[];
}

export function encoderEtat(etat: EtatPartage): string {
  const graines = etat.graines
    .filter((g) => g.quantite > 0)
    .map((g) => (g.quantite > 1 ? `${formatGenome(g.genome)}x${g.quantite}` : formatGenome(g.genome)))
    .join(",");

  const params = new URLSearchParams();
  params.set("p", etat.plante);
  params.set("c", formatGenome(etat.cible));
  if (graines) params.set("g", graines);
  return params.toString();
}

export function decoderEtat(fragment: string): Partial<EtatPartage> | null {
  const brut = fragment.replace(/^#/, "");
  if (!brut) return null;

  const params = new URLSearchParams(brut);
  const out: Partial<EtatPartage> = {};

  const p = params.get("p");
  if (p && PLANTES.some((x) => x.id === p)) out.plante = p as PlanteId;

  const c = parseGenome(params.get("c") ?? "");
  if (c) out.cible = c;

  const g = params.get("g");
  if (g) {
    const graines: EtatPartage["graines"] = [];
    for (const morceau of g.split(",")) {
      const [code, qte] = morceau.split("x");
      const genome = parseGenome(code ?? "");
      if (!genome) continue;
      const quantite = Math.min(99, Math.max(1, Number(qte) || 1));
      graines.push({ genome, quantite });
    }
    if (graines.length > 0) out.graines = graines;
  }

  return Object.keys(out).length > 0 ? out : null;
}

/** Met à jour le fragment sans empiler d'entrée dans l'historique. */
export function ecrireFragment(etat: EtatPartage) {
  if (typeof window === "undefined") return;
  const url = `${window.location.pathname}#${encoderEtat(etat)}`;
  window.history.replaceState(null, "", url);
}

export function lienComplet(etat: EtatPartage): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#${encoderEtat(etat)}`;
}
