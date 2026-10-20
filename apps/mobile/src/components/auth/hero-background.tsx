import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { AuthPalette } from "@/constants/theme";

// Fondo de marca de las pantallas de auth: degradado diagonal oliva → negro con
// dos círculos decorativos de acento. Siempre oscuro, en ambos modos.
export function HeroBackground() {
  // `useId` devuelve ":r0:"; los dos puntos rompen `url(#…)` en la web.
  const gradientId = `hero-${useId().replace(/:/g, "")}`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AuthPalette.heroFrom} />
            <Stop offset="0.55" stopColor={AuthPalette.heroVia} />
            <Stop offset="1" stopColor={AuthPalette.heroTo} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      <View style={[styles.circle, styles.circleLarge]} />
      <View style={[styles.circle, styles.circleRing]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { position: "absolute", borderRadius: 999 },
  circleLarge: {
    width: 240,
    height: 240,
    top: -90,
    right: -80,
    backgroundColor: AuthPalette.heroGlow,
  },
  circleRing: {
    width: 120,
    height: 120,
    top: 120,
    left: -60,
    borderWidth: 1.5,
    borderColor: AuthPalette.heroGlow,
  },
});
