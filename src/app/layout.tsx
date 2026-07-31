import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  title: "Centro Cristiano Casa del Rey Popayán",
  description: "Sistema de gestión e información institucional",
  icons: {
    icon: "/Logo-Verde-sin-texto.png", // Icono en la pestaña del navegador
    apple: "/Logo-Verde-sin-texto.png", // Para dispositivos Apple cuando guardan acceso directo
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}