"use client";

type ErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorState({ error, reset }: ErrorStateProps) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 p-6">
      <p className="text-sm font-medium text-red-700">No se pudo cargar la página.</p>
      <h1 className="text-2xl font-semibold">Ha ocurrido un error inesperado</h1>
      <p className="text-slate-700">
        Inténtalo de nuevo. Si el problema continúa, vuelve a cargar la aplicación.
      </p>
      {error.digest ? (
        <p className="text-sm text-slate-600">Código: {error.digest}</p>
      ) : null}
      <button
        className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
        onClick={reset}
        type="button"
      >
        Reintentar
      </button>
    </main>
  );
}
