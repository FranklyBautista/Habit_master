import { Stack } from "expo-router";

// Grupos no tiene pestaña propia (la barra se queda con 5): se entra desde Hoy
// y Ajustes, y aquí se apilan lista → grupo → ajustes del grupo.
export default function GruposLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
