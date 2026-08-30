import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main-content">
      <section className="state-card card state-card--error">
        <div>
          <span className="section-kicker">Error 404</span>
          <h1>No encontramos esta página</h1>
          <p>La dirección puede estar incompleta o la página ya no existe.</p>
          <Link className="button button--primary button--default" href="/hoy">
            Volver a Hoy
          </Link>
        </div>
      </section>
    </main>
  );
}
