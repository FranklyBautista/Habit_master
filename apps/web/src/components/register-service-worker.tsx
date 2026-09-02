"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` in production builds only. Service workers cache
 * aggressively by nature, which fights Next.js's dev server hot reloading,
 * so we skip registration in development.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("No se pudo registrar el service worker", error);
    });
  }, []);

  return null;
}
