import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { RegisterServiceWorker } from "@/components/register-service-worker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Constancia — Habit Tracker",
    template: "%s · Constancia",
  },
  description: "Construye constancia, un día a la vez.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Constancia",
  },
};

export const viewport: Viewport = {
  // Mismo fondo de página que la app (claro u oscuro según el sistema).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F3EF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0C" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
