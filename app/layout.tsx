import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { InteractionLayer } from "./components/InteractionLayer";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: { default: "Gaudeamus Mentor — Učenje koje ostaje", template: "%s · Gaudeamus Mentor" },
  description: "Pronađi provjerenog profesora, održi instrukcije i nastavi učiti uz osobnog AI mentora.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Gaudeamus Mentor — Učenje koje ostaje",
    description: "Provjereni profesori, sigurna rezervacija i AI koji pretvara svaki sat u trajno znanje.",
    images: [{ url: "/og.png", width: 1536, height: 1024 }],
    locale: "hr_HR",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hr">
      <body className={`${inter.variable} ${playfair.variable}`}>{children}<InteractionLayer /></body>
    </html>
  );
}
