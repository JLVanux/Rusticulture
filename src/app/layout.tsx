import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});
const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "RustiCulture — les outils d'agriculture de Rust",
  description:
    "RustiCulture : croisement génétique, rendement, thés, tartes, minuteurs de plantation et poulailler. Tous les calculs d'agriculture de Rust, en français.",
};

export const viewport: Viewport = {
  themeColor: "#0b0f0d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col lg:flex-row">
          <Nav />
          <main className="min-w-0 flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
