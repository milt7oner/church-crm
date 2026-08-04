import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "light",
  themeColor: "#006C69", // 🎯 Define el color esmeralda corporativo en la barra superior del celular
};

export const metadata: Metadata = {
  title: "Centro Cristiano Casa del Rey Popayán",
  description: "Sistema de gestión e información institucional",
  manifest: "/manifest.webmanifest", // 🎯 Conecta el archivo de configuración PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Casa del Rey",
  },
  icons: {
    icon: "/Logo-Verde-sin-texto.png",
    apple: "/Logo-Verde-sin-texto.png",
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
      <body className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}