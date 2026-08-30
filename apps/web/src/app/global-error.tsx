"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="es">
      <body className="m-0 bg-slate-50 font-sans text-slate-900">
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-start justify-center gap-4 p-6">
          <p className="text-sm font-medium text-red-700">Error crítico</p>
          <h1 className="text-2xl font-semibold">No se pudo iniciar Habit Tracker</h1>
          <p className="text-slate-700">
            Recarga la página o inténtalo de nuevo en unos instantes.
          </p>
          {error.digest ? (
            <p className="text-sm text-slate-600">Código: {error.digest}</p>
          ) : null}
          <button
            className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white"
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
