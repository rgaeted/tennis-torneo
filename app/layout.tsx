import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MisTorneos.cl",
  description: "Plataforma de torneos y marcadores en vivo para el tenis chileno",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geist.className} bg-navy-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
