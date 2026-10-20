import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Türkiye Nabzı — İllere Göre Haber Duygu Haritası",
  description:
    "Türkiye'deki haberleri yapay zekâ ile analiz edip 81 ilin duygu tonunu interaktif bir harita üzerinde gösteren gösterge paneli.",
};

export const viewport: Viewport = {
  themeColor: "#05070f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="relative min-h-full">
        <AmbientBackground />
        <div className="relative z-10 flex min-h-dvh flex-col">{children}</div>
      </body>
    </html>
  );
}
