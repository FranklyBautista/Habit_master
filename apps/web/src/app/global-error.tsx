"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="es">
      <body className="m-0 bg-background font-sans text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-start justify-center gap-4 p-6">
          <p className="text-sm font-semibold text-error">Error crítico</p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            No se pudo iniciar Habit Tracker
          </h1>
          <p className="text-muted">
            Recarga la página o inténtalo de nuevo en unos instantes.
          </p>
          {error.digest ? (
            <p className="text-sm text-muted">Código: {error.digest}</p>
          ) : null}
          <button
            className="min-h-12 rounded-full bg-accent px-6 py-3 font-bold text-on-accent"
            onClick={reset}
            type="button"
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
