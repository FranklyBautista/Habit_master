import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/hoy",
    name: "Constancia — Habit Tracker",
    short_name: "Constancia",
    description: "Construye constancia, un día a la vez.",
    start_url: "/hoy",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    lang: "es",
    // El manifest no admite colores por esquema: se usa el oscuro de la marca
    // (superficies casi negras con acento lima, como la app móvil).
    background_color: "#0B0B0C",
    theme_color: "#0B0B0C",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
