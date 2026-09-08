import { z } from "zod";

// Mirrors apps/web/src/app/(auth)/actions.ts#credentialsSchema.
export const credentialsSchema = z.object({
  email: z.email("Escribe un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});
