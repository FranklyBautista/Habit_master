import { AuthFooterLink, AuthScreen } from "@/components/auth-screen";
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
  const backToLogin = <AuthFooterLink label="Volver a iniciar sesión" href="/login" />;

  if (!email || !type) {
    return (
      <AuthScreen
        title="No se pudo abrir"
        highlight="la verificación"
        backHref="/login"
        footer={backToLogin}
      >
        <p className="auth-sheet__text">
          El enlace está incompleto. Vuelve a pedir el código desde el inicio de sesión.
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title={type === "signup" ? "Confirma tu" : "Recupera tu"}
      highlight={type === "signup" ? "correo" : "cuenta"}
      subtitle={
        <>
          {type === "signup"
            ? `Escribe el código que enviamos a ${email}.`
            : `Si hay una cuenta con ${email}, te enviamos un código.`}{" "}
          Puede tardar un minuto; revisa también la carpeta de spam. También puedes
          abrir el enlace del correo.
        </>
      }
      backHref="/login"
      footer={
        <AuthFooterLink
          prompt="¿Correo equivocado?"
          label="Volver a iniciar sesión"
          href="/login"
        />
      }
    >
      <VerifyCodeForm email={email} type={type} />
    </AuthScreen>
  );
}
