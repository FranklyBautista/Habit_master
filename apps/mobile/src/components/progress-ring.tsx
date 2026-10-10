import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme } from "@/hooks/use-theme";

type ProgressRingProps = {
  // 0–100; null = sin hábitos previstos (anillo vacío, sin 0 % ficticio).
  percentage: number | null;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
};

export function ProgressRing({
  percentage,
  size = 96,
  strokeWidth = 10,
  children,
}: ProgressRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, percentage ?? 0)) / 100;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {progress > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - progress)}
            fill="none"
            // Empieza arriba (las 12) en vez de a las 3.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
