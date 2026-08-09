import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Nav from "@/components/Nav";

/**
 * Une famille de texte, une mono. Pas de troisième.
 *
 * Archivo est une grotesque un peu large, avec une vraie échelle de graisses :
 * elle porte les titres en 800 sans avoir besoin de capitales condensées — le
 * cliché du « site de jeu », et l'un des marqueurs de l'interface générique.
 *
 * La mono ne sert pas à décorer : ce site fait lire des chiffres, et la chasse
 * fixe empêche une valeur qui change chaque seconde de faire danser sa ligne.
 */
const display = { variable: "x" };
const body = { variable: "y" };
const mono = { variable: "z" };

export const metadata: Metadata = {
  title: "RustiCulture — les outils d'agriculture de Rust",
  description:
    "RustiCulture : croisement génétique, rendement, thés, tartes, minuteurs de plantation et poulailler. Tous les calculs d'agriculture de Rust, en français.",
};

export const viewport: Viewport = {
  themeColor: "#141210",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
          <Nav />
          <main className="min-w-0 flex-1 px-4 pt-5 pb-[calc(var(--barre-basse)+1.5rem)] sm:px-6 lg:px-10 lg:pb-16 lg:pt-8">{children}</main>
        </div>
        {/* Mesures hébergées par Vercel, sans cookie : aucun bandeau de
            consentement à afficher. Inactives hors production.
            Analytics = fréquentation. SpeedInsights = vitesse réellement
            ressentie par les visiteurs. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
