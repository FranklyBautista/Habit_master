import type { PetMood, PetStage } from "@habit-tracker/domain";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Polygon,
  Text as SvgText,
} from "react-native-svg";

// Pulpito de la mascota del grupo (C6, docs/product/MASCOTA_GRUPO.md). Misma
// geometría que la web (`apps/web/src/components/groups/group-pet-card.tsx`).
// Animaciones básicas con `Animated` de React Native (sin módulos nativos
// nuevos): flota, rebota si está contenta, se balancea si tiene hambre y
// parpadea. Con "reducir movimiento" se queda quieto.

const stageScale: Record<PetStage, number> = {
  cria: 0.6,
  pequena: 0.74,
  joven: 0.87,
  adulta: 1,
};

const moodColors: Record<PetMood, { fill: string; stroke: string }> = {
  contenta: { fill: "#F4877A", stroke: "#C85A50" },
  hambrienta: { fill: "#F4877A", stroke: "#C85A50" },
  triste: { fill: "#A9B3CC", stroke: "#7F8BA8" },
  dormida: { fill: "#C3B1E1", stroke: "#9A86BF" },
};

const moodMotion: Record<PetMood, { lift: number; duration: number; sway: number }> = {
  contenta: { lift: 7, duration: 800, sway: 0 },
  hambrienta: { lift: 3, duration: 1400, sway: 4 },
  triste: { lift: 2, duration: 2500, sway: 0 },
  dormida: { lift: 2, duration: 3000, sway: 0 },
};

const faceColor = "#2B2B30";
const tentacles = [
  { x: 36, dir: -1 },
  { x: 46, dir: -1 },
  { x: 55, dir: -1 },
  { x: 65, dir: 1 },
  { x: 74, dir: 1 },
  { x: 84, dir: 1 },
];

function tentaclePath(x: number, dir: number) {
  return `M ${x} 62 C ${x} 82, ${x + dir * 10} 84, ${x + dir * 6} 96 S ${x + dir * 14} 108, ${x + dir * 18} 101`;
}

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}

function useBlink(enabled: boolean) {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      setClosed(true);
      timeout = setTimeout(() => setClosed(false), 160);
    }, 4500);
    return () => {
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [enabled]);
  return closed;
}

function Eyes({ mood, blinking }: { mood: PetMood; blinking: boolean }) {
  if (mood === "contenta" || mood === "dormida" || blinking) {
    const curve = mood === "contenta" ? -8 : mood === "dormida" ? 6 : 0;
    return (
      <G stroke={faceColor} strokeWidth={3} strokeLinecap="round" fill="none">
        {[48, 72].map((x) => (
          <Path key={x} d={`M ${x - 6} 51 Q ${x} ${51 + curve} ${x + 6} 51`} />
        ))}
      </G>
    );
  }
  const pupilY = mood === "triste" ? 53 : 51;
  return (
    <G>
      {[48, 72].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={50} r={7.5} fill="#FFFFFF" />
          <Circle cx={x + 1} cy={pupilY} r={4} fill={faceColor} />
          <Circle cx={x + 2.5} cy={pupilY - 1.5} r={1.4} fill="#FFFFFF" />
        </G>
      ))}
      {mood === "triste" ? (
        <G stroke={faceColor} strokeWidth={2.5} strokeLinecap="round">
          <Path d="M 41 43 L 53 39" />
          <Path d="M 67 39 L 79 43" />
        </G>
      ) : null}
    </G>
  );
}

function Mouth({ mood }: { mood: PetMood }) {
  if (mood === "hambrienta") {
    return <Ellipse cx={60} cy={65} rx={4} ry={5} fill={faceColor} />;
  }
  const d = {
    contenta: "M 53 62 Q 60 70 67 62",
    triste: "M 53 67 Q 60 61 67 67",
    dormida: "M 56 64 L 64 64",
  }[mood];
  return (
    <Path d={d} stroke={faceColor} strokeWidth={3} strokeLinecap="round" fill="none" />
  );
}

export function PetArt({
  stage,
  mood,
  label,
  size = 128,
}: {
  stage: PetStage;
  mood: PetMood;
  label: string;
  size?: number;
}) {
  const reduceMotion = useReduceMotion();
  const blinking = useBlink(
    !reduceMotion && (mood === "hambrienta" || mood === "triste"),
  );
  const [phase] = useState(() => new Animated.Value(0));
  const motion = moodMotion[mood];

  useEffect(() => {
    phase.setValue(0);
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: motion.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: motion.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, reduceMotion, motion.duration]);

  const scale = stageScale[stage];
  const colors = moodColors[mood];
  const hasSpots = stage === "joven" || stage === "adulta";
  const translateY = phase.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -motion.lift],
  });
  const rotate = phase.interpolate({
    inputRange: [0, 1],
    outputRange: [`${-motion.sway}deg`, `${motion.sway}deg`],
  });

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size, transform: [{ translateY }, { rotate }] }}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <G transform={`translate(60 114) scale(${scale}) translate(-60 -114)`}>
          {tentacles.map(({ x, dir }) => (
            <Path
              key={x}
              d={tentaclePath(x, dir)}
              stroke={colors.fill}
              strokeWidth={8}
              strokeLinecap="round"
              fill="none"
            />
          ))}
          <Ellipse
            cx={60}
            cy={48}
            rx={32}
            ry={30}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={2}
          />
          {hasSpots ? (
            <G fill="#FFFFFF" opacity={0.35}>
              <Circle cx={44} cy={31} r={4} />
              <Circle cx={76} cy={29} r={3} />
              <Circle cx={63} cy={23} r={2.5} />
            </G>
          ) : null}
          {stage === "adulta" ? (
            <Polygon
              points="47,21 51,8 57,16 60,5 63,16 69,8 73,21"
              fill="#FACC15"
              stroke="#CA8A04"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          ) : null}
          <G fill="#FF6B8B" opacity={0.45}>
            <Ellipse cx={38} cy={60} rx={5} ry={3} />
            <Ellipse cx={82} cy={60} rx={5} ry={3} />
          </G>
          <Eyes mood={mood} blinking={blinking} />
          <Mouth mood={mood} />
          {mood === "dormida" ? (
            <G fill={colors.stroke}>
              <SvgText x={88} y={30} fontSize={12} fontWeight="700">
                z
              </SvgText>
              <SvgText x={97} y={18} fontSize={16} fontWeight="700">
                Z
              </SvgText>
            </G>
          ) : null}
        </G>
      </Svg>
    </Animated.View>
  );
}
