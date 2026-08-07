"use client";

import { GENE_LETTERS, type GeneLetter, type Genome } from "@/data/game";

// -----------------------------------------------------------------------------
// Deux façons de lire les gènes à l'écran.
//
// 1. OCR (Tesseract) — reconnaît la forme des lettres. Générique, mais sensible
//    à la résolution, à l'anticrénelage et au fond.
// 2. Couleur — chaque gène s'affiche dans une teinte distincte en jeu. On
//    découpe la zone en six colonnes et on compare la teinte dominante de
//    chacune à une palette. Déterministe, instantané, sans téléchargement.
//
// Le mode couleur ne fonctionne qu'après apprentissage : on ne peut pas deviner
// la palette exacte du jeu, donc on la fait enseigner une fois par la personne.
// -----------------------------------------------------------------------------

export interface Zone {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

const AGRANDISSEMENT = 4;

// -----------------------------------------------------------------------------
// Prétraitement pour l'OCR
// -----------------------------------------------------------------------------

export function preparerImage(source: Source, zone: Zone): { normal: HTMLCanvasElement; inverse: HTMLCanvasElement } | null {
  const l = Math.max(1, Math.round(zone.largeur));
  const h = Math.max(1, Math.round(zone.hauteur));

  const brut = document.createElement("canvas");
  brut.width = l * AGRANDISSEMENT;
  brut.height = h * AGRANDISSEMENT;
  const ctx = brut.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, zone.x, zone.y, l, h, 0, 0, brut.width, brut.height);

  const donnees = ctx.getImageData(0, 0, brut.width, brut.height);
  const px = donnees.data;

  let somme = 0;
  const gris = new Uint8ClampedArray(px.length / 4);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    gris[j] = v;
    somme += v;
  }
  const moyenne = somme / gris.length;

  const normal = document.createElement("canvas");
  const inverse = document.createElement("canvas");
  normal.width = inverse.width = brut.width;
  normal.height = inverse.height = brut.height;
  const cn = normal.getContext("2d");
  const ci = inverse.getContext("2d");
  if (!cn || !ci) return null;

  const imgN = cn.createImageData(brut.width, brut.height);
  const imgI = ci.createImageData(brut.width, brut.height);

  for (let j = 0; j < gris.length; j++) {
    const clair = gris[j] > moyenne;
    const vN = clair ? 0 : 255;
    const vI = clair ? 255 : 0;
    const k = j * 4;
    imgN.data[k] = imgN.data[k + 1] = imgN.data[k + 2] = vN;
    imgN.data[k + 3] = 255;
    imgI.data[k] = imgI.data[k + 1] = imgI.data[k + 2] = vI;
    imgI.data[k + 3] = 255;
  }

  cn.putImageData(imgN, 0, 0);
  ci.putImageData(imgI, 0, 0);
  return { normal, inverse };
}

export function extraireGenomes(texte: string): Genome[] {
  const nettoye = texte.toUpperCase().replace(/[^GYHWX]/g, "");
  const out: Genome[] = [];
  for (let i = 0; i + 6 <= nettoye.length; i += 6) {
    out.push(nettoye.slice(i, i + 6).split("") as GeneLetter[]);
  }
  return out;
}

let workerPromise: Promise<unknown> | null = null;
let modeActuel: "ligne" | "bloc" | null = null;

async function obtenirWorker(mode: "ligne" | "bloc") {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng");
    })();
    modeActuel = null;
  }
  const worker = (await workerPromise) as {
    setParameters: (p: Record<string, string>) => Promise<unknown>;
  };
  if (modeActuel !== mode) {
    await worker.setParameters({
      // Cinq caractères possibles au lieu de vingt-six : c'est ce réglage qui
      // fait l'essentiel de la précision.
      tessedit_char_whitelist: "GYHWX",
      // 7 = une seule ligne de texte, 6 = bloc de plusieurs lignes.
      tessedit_pageseg_mode: mode === "ligne" ? "7" : "6",
      preserve_interword_spaces: "0",
    });
    modeActuel = mode;
  }
  return worker;
}

export async function lireParOcr(
  source: Source,
  zone: Zone,
  mode: "ligne" | "bloc" = "ligne"
): Promise<{ genomes: Genome[]; confiance: number; texte: string }> {
  const prepare = preparerImage(source, zone);
  if (!prepare) return { genomes: [], confiance: 0, texte: "" };

  const worker = (await obtenirWorker(mode)) as unknown as {
    recognize: (c: HTMLCanvasElement) => Promise<{ data: { text: string; confidence: number } }>;
  };

  const essais = await Promise.all(
    [prepare.normal, prepare.inverse].map(async (canvas) => {
      try {
        const { data } = await worker.recognize(canvas);
        return { texte: data.text ?? "", confiance: data.confidence ?? 0 };
      } catch {
        return { texte: "", confiance: 0 };
      }
    })
  );

  const notes = essais.map((e) => {
    const g = extraireGenomes(e.texte);
    return { ...e, genomes: g, note: g.length * 1000 + e.confiance };
  });
  notes.sort((a, b) => b.note - a.note);
  return { genomes: notes[0].genomes, confiance: notes[0].confiance, texte: notes[0].texte };
}

export async function libererWorker() {
  if (!workerPromise) return;
  const worker = (await workerPromise) as { terminate: () => Promise<void> };
  await worker.terminate();
  workerPromise = null;
  modeActuel = null;
}

// -----------------------------------------------------------------------------
// Mode couleur
// -----------------------------------------------------------------------------

/** Signature d'une couleur : chromaticité rouge/verte + saturation. */
export type Signature = [number, number, number];

export type Palette = Partial<Record<GeneLetter, Signature>>;

function signature(r: number, g: number, b: number): Signature {
  const somme = r + g + b || 1;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return [r / somme, g / somme, saturation];
}

function distance(a: Signature, b: Signature): number {
  // La saturation pèse autant que la teinte : c'est elle qui sépare le gris (X)
  // d'une couleur franche.
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const ds = (a[2] - b[2]) * 0.6;
  return Math.sqrt(dr * dr + dg * dg + ds * ds);
}

/**
 * Découpe la zone en six colonnes et renvoie la signature dominante de chacune.
 * On ne moyenne pas bêtement : on ne garde que le quart de pixels les plus
 * saturés et les plus lumineux de la colonne, pour ignorer le fond.
 */
export function echantillonnerColonnes(source: Source, zone: Zone, n = 6): Signature[] | null {
  const l = Math.max(1, Math.round(zone.largeur));
  const h = Math.max(1, Math.round(zone.hauteur));

  const canvas = document.createElement("canvas");
  canvas.width = l;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, zone.x, zone.y, l, h, 0, 0, l, h);

  const px = ctx.getImageData(0, 0, l, h).data;
  const out: Signature[] = [];

  for (let c = 0; c < n; c++) {
    const debut = Math.floor((c * l) / n);
    const fin = Math.floor(((c + 1) * l) / n);
    const pixels: { r: number; g: number; b: number; poids: number }[] = [];

    for (let y = 0; y < h; y++) {
      for (let x = debut; x < fin; x++) {
        const k = (y * l + x) * 4;
        const r = px[k];
        const g = px[k + 1];
        const b = px[k + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        // Un pixel intéressant est soit coloré, soit clair : dans les deux cas
        // il appartient au glyphe, pas au fond.
        pixels.push({ r, g, b, poids: sat * 255 + max });
      }
    }

    if (pixels.length === 0) return null;
    pixels.sort((a, b) => b.poids - a.poids);
    const garde = pixels.slice(0, Math.max(1, Math.floor(pixels.length / 4)));

    let sr = 0;
    let sg = 0;
    let sb = 0;
    for (const p of garde) {
      sr += p.r;
      sg += p.g;
      sb += p.b;
    }
    out.push(signature(sr / garde.length, sg / garde.length, sb / garde.length));
  }

  return out;
}

/** Enseigne la palette à partir d'une zone dont on connaît les gènes. */
export function apprendrePalette(
  source: Source,
  zone: Zone,
  verite: Genome,
  existante: Palette
): Palette | null {
  const colonnes = echantillonnerColonnes(source, zone, 6);
  if (!colonnes) return null;

  const cumul: Partial<Record<GeneLetter, { s: Signature; n: number }>> = {};
  verite.forEach((lettre, i) => {
    const c = cumul[lettre] ?? { s: [0, 0, 0] as Signature, n: 0 };
    c.s = [c.s[0] + colonnes[i][0], c.s[1] + colonnes[i][1], c.s[2] + colonnes[i][2]];
    c.n += 1;
    cumul[lettre] = c;
  });

  const suivante: Palette = { ...existante };
  for (const lettre of GENE_LETTERS) {
    const c = cumul[lettre];
    if (!c) continue;
    const moyenne: Signature = [c.s[0] / c.n, c.s[1] / c.n, c.s[2] / c.n];
    const ancienne = existante[lettre];
    // On mélange avec ce qui était déjà appris, pour lisser d'un apprentissage
    // à l'autre.
    suivante[lettre] = ancienne
      ? [
          (ancienne[0] + moyenne[0]) / 2,
          (ancienne[1] + moyenne[1]) / 2,
          (ancienne[2] + moyenne[2]) / 2,
        ]
      : moyenne;
  }
  return suivante;
}

export interface LectureCouleur {
  genome: Genome;
  /** Écart à la couleur de référence, case par case. Plus c'est bas, plus c'est sûr. */
  ecarts: number[];
  /** Le pire écart des six. Sert de signal de doute. */
  ecartMax: number;
}

export function lireParCouleur(source: Source, zone: Zone, palette: Palette): LectureCouleur | null {
  const connues = GENE_LETTERS.filter((l) => palette[l]);
  if (connues.length === 0) return null;

  const colonnes = echantillonnerColonnes(source, zone, 6);
  if (!colonnes) return null;

  const genome: GeneLetter[] = [];
  const ecarts: number[] = [];

  for (const sig of colonnes) {
    let meilleure: GeneLetter = connues[0];
    let meilleurEcart = Infinity;
    for (const lettre of connues) {
      const d = distance(sig, palette[lettre]!);
      if (d < meilleurEcart) {
        meilleurEcart = d;
        meilleure = lettre;
      }
    }
    genome.push(meilleure);
    ecarts.push(meilleurEcart);
  }

  return { genome: genome as Genome, ecarts, ecartMax: Math.max(...ecarts) };
}

export function paletteComplete(palette: Palette): boolean {
  return GENE_LETTERS.every((l) => palette[l]);
}
