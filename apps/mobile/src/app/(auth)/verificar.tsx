import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OtpCodeInput } from "@/components/otp-code-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { OTP_CODE_LENGTH, otpCodeSchema } from "@/lib/auth/credentials-schema";
import { authErrorMessage } from "@/lib/auth/errors";
import { authFormStyles as styles } from "@/lib/auth/form-styles";
import { getMobileAuthRedirect } from "@/lib/auth/redirect";
import { supabase } from "@/lib/supabase/client";

// Supabase hosted limita los reenvíos de correo a uno por minuto por defecto
// (`[auth.email] max_frequency`); el botón espera lo mismo para no gastar
// intentos que el servidor rechazaría.
const RESEND_COOLDOWN_SECONDS = 60;

type VerifyType = "signup" | "recovery";

function parseType(value: string | string[] | undefined): VerifyType | undefined {
  const type = Array.isArray(value) ? value[0] : value;
  return type === "signup" || type === "recovery" ? type : undefined;
}

// Pantalla común para el código que llega por correo al registrarse o al
// recuperar la contraseña. Sustituye al enlace mágico en móvil: el enlace
// sacaba al usuario a un navegador y, con PKCE, solo servía si se abría en el
// mismo teléfono; el código se escribe aquí mismo desde cualquier dispositivo.
export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ email?: string; type?: string }>();
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const type = parseType(params.type);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!email || !type) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText>No se pudo abrir la verificación.</ThemedText>
          <Link href="/(auth)/login">
            <ThemedText type="link">Volver a iniciar sesión</ThemedText>
          </Link>
        </SafeAreaView>
      </ThemedView>
    );
  }

  async function handleVerify() {
    if (!email || !type) return;
    setError(undefined);
    setMessage(undefined);
    const parsed = otpCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: parsed.data,
      type,
    });
    setSubmitting(false);
    if (verifyError) {
      setError(authErrorMessage(verifyError.message));
      return;
    }
    // verificar no está entre los "auth redirect paths" de AuthGate (para que
    // la recuperación no salte a la app antes de cambiar la contraseña), así
    // que se navega a mano en ambos casos.
    router.replace(type === "recovery" ? "/(auth)/actualizar-contrasena" : "/(app)");
  }

  async function handleResend() {
    if (!email || !type) return;
    setError(undefined);
    setMessage(undefined);
    setResending(true);
    const { error: resendError } =
      type === "signup"
        ? await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo: getMobileAuthRedirect("/(app)") },
          })
        : await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getMobileAuthRedirect("/(auth)/actualizar-contrasena"),
          });
    setResending(false);
    if (resendError) {
      setError(authErrorMessage(resendError.message));
      return;
    }
    setMessage("Te enviamos un código nuevo.");
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  const resendDisabled = resending || cooldown > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">
          {type === "signup" ? "Confirma tu correo" : "Recupera tu cuenta"}
        </ThemedText>
        <ThemedText>
          Escribe el código que enviamos a {email}. Puede tardar un minuto; revisa
          también la carpeta de spam.
        </ThemedText>
        <OtpCodeInput
          accessibilityLabel="Código de verificación"
          length={OTP_CODE_LENGTH}
          value={code}
          onChangeText={setCode}
        />
        {error ? (
          <ThemedText accessibilityRole="alert" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
        {message ? <ThemedText>{message}</ThemedText> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Verificar código"
          accessibilityState={{ disabled: submitting }}
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleVerify}
        >
          <ThemedText type="smallBold">
            {submitting ? "Verificando…" : "Verificar código"}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reenviar código"
          accessibilityState={{ disabled: resendDisabled }}
          disabled={resendDisabled}
          onPress={handleResend}
        >
          <ThemedText type="link">
            {resending
              ? "Reenviando…"
              : cooldown > 0
                ? `Reenviar código en ${cooldown} s`
                : "Reenviar código"}
          </ThemedText>
        </Pressable>
        <Link href="/(auth)/login">
          <ThemedText type="link">Volver a iniciar sesión</ThemedText>
        </Link>
      </SafeAreaView>
    </ThemedView>
  );
}
