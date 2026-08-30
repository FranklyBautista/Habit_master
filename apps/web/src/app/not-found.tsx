import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 p-6">
      <p className="text-sm font-medium text-slate-600">Error 404</p>
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-slate-700">
        La dirección puede estar incompleta o la página ya no existe.
      </p>
      <Link
        className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
        href="/"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
