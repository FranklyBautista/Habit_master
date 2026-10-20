import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

type AuthScreenProps = {
  // Primera línea del saludo, en claro.
  title: string;
  // Segunda línea, en lima.
  highlight?: string;
  subtitle?: ReactNode;
  // Flecha para volver (p. ej. a la bienvenida).
  backHref?: string;
  footer?: ReactNode;
  children: ReactNode;
};

// Igual que AuthScaffold en móvil: cabecera oscura con degradado y saludo
// grande, y debajo una hoja redondeada con el formulario y el pie.
export function AuthScreen({
  title,
  highlight,
  subtitle,
  backHref,
  footer,
  children,
}: AuthScreenProps) {
  return (
    <section className="auth-card">
      <header className="auth-hero">
        {backHref ? (
          <Link className="auth-back" href={backHref} aria-label="Volver">
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
        ) : null}
        <h1>
          {title}
          {highlight ? (
            <>
              <br />
              <span>{highlight}</span>
            </>
          ) : null}
        </h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>
      <div className="auth-sheet">
        {children}
        {footer ? <footer className="auth-footer">{footer}</footer> : null}
      </div>
    </section>
  );
}

// Pie alineado a la derecha: pregunta en gris y enlace en negrita debajo.
export function AuthFooterLink({
  prompt,
  label,
  href,
}: {
  prompt?: string;
  label: string;
  href: string;
}) {
  return (
    <p className="auth-footer-link">
      {prompt ? <span>{prompt}</span> : null}
      <Link href={href}>{label}</Link>
    </p>
  );
}
