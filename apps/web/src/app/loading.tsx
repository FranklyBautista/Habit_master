import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" className="main-content loading-stack">
      <span className="sr-only">Cargando contenido</span>
      <Skeleton className="skeleton--title" />
      <div className="metric-grid">
        <Skeleton className="skeleton--card" />
        <Skeleton className="skeleton--card" />
      </div>
      <Skeleton className="skeleton--panel" />
    </main>
  );
}
