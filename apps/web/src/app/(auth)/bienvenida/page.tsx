import { Sparkles } from "lucide-react";
import Link from "next/link";

// Portada sin sesión, como (auth)/bienvenida.tsx en móvil: marca, saludo y
// las dos entradas sobre la cabecera oscura a pantalla completa.
export default function WelcomePage() {
  return (
    <section className="auth-card auth-card--welcome">
      <div className="auth-welcome__brand">
        <span className="auth-welcome__mark" aria-hidden="true">
          <Sparkles size={34} strokeWidth={2.4} />
        </span>
        <span>CONSTANCIA</span>
      </div>
      <div className="auth-welcome__center">
        <h1>Bienvenido</h1>
        <p>
          Pequeños hábitos, cada día.
          <br />
          Grandes cambios, a tu ritmo.
        </p>
      </div>
      <div className="auth-welcome__actions">
        <Link className="button auth-button--outline" href="/login">
          Iniciar sesión
        </Link>
        <Link className="button button--primary" href="/registro">
          Crear cuenta
        </Link>
      </div>
    </section>
  );
}
