import type { Config } from "tailwindcss";

/**
 * Jetons de la charte — voir CHARTE.md.
 *
 * Source : l'inventaire de Rust. Du béton sale, du métal oxydé, un orange qui
 * ne sert qu'à signaler. Aucune couleur froide, aucune ombre colorée.
 *
 * Les anciens noms de jetons (`nuit`, `feuille`, `lampe`, `verre`, `mur`) sont
 * conservés comme alias : les réécrire dans vingt et une pages n'aurait rien
 * changé au rendu et aurait multiplié les risques.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fond: "#141210",
        case: {
          DEFAULT: "#1c1a17",
          haute: "#242019",
          creuse: "#100e0c",
        },
        trait: {
          DEFAULT: "#2f2a24",
          vif: "#453d34",
        },
        rouille: "#ce422b",
        braise: "#e8683f",
        craie: "#e8e2d8",
        cendre: "#a09788",
        poussiere: "#6b6358",

        // Alias vers les anciens noms.
        nuit: {
          900: "#141210",
          800: "#1c1a17",
          700: "#242019",
          600: "#2f2a24",
          500: "#453d34",
        },
        feuille: {
          100: "#e8e2d8",
          200: "#cfc7ba",
          400: "#a09788",
          600: "#6b6358",
        },
        lampe: {
          DEFAULT: "#ce422b",
          froid: "#8a2f1c",
          chaud: "#e8683f",
        },
        verre: {
          bord: "#2f2a24",
          haut: "#1c1a17",
          bas: "#1c1a17",
        },
        mur: "#d8a13c",

        gene: {
          g: "#5fd39a",
          y: "#f2cf5b",
          h: "#6fbfe0",
          w: "#e8735f",
          x: "#8a9299",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      // Rust est anguleux : 4 px au maximum, 2 px pour les cases.
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "3px",
        md: "3px",
        lg: "4px",
        xl: "4px",
        "2xl": "4px",
        "3xl": "6px",
        full: "9999px",
        verre: "4px",
      },
      boxShadow: {
        // Aucune ombre colorée, aucun halo. La structure vient des traits.
        verre: "none",
        lueur: "none",
      },
    },
  },
  plugins: [],
};
export default config;
