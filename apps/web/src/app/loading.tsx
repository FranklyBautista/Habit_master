export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6"
    >
      <span className="sr-only">Cargando contenido</span>
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
      <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
    </main>
  );
}
