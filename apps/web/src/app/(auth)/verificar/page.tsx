import { AuthLink } from "@/components/auth-form";
import { VerifyCodeForm } from "@/components/verify-code-form";
import { parseVerifyType } from "@/lib/auth/otp";

// Common page for the emailed code after registering or asking to recover the
// password. The email also carries a link (handled by /auth/confirm), but the
// code works from any device, while the PKCE link only works in the browser
// that requested it.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : undefined;
  const type = parseVerifyType(params.type);

  if (!email || !type) {
    return (
      <>
        <div className="auth-heading">
          <h1>No se pudo abrir la verificación</h1>
        </div>
        <div className="auth-links">
          <AuthLink href="/login">Volver a iniciar sesión</AuthLink>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="auth-heading">
        <span className="section-kicker">
          {type === "signup" ? "Último paso" : "Recuperación"}
        </span>
        <h1>{type === "signup" ? "Confirma tu correo" : "Recupera tu cuenta"}</h1>
        <p>
          {type === "signup"
            ? `Escribe el código que enviamos a ${email}.`
            : `Si hay una cuenta con ${email}, te enviamos un código.`}{" "}
          Puede tardar un minuto; revisa también la carpeta de spam. También puedes
          abrir el enlace del correo.
        </p>
      </div>
      <VerifyCodeForm email={email} type={type} />
    </>
  );
}
