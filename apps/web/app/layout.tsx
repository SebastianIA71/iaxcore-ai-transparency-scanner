import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "./_components/Footer";

export const metadata: Metadata = {
  title: "IAXCORE AI Transparency Scanner",
  description: "Escáner de señales observables de transparencia de IA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
