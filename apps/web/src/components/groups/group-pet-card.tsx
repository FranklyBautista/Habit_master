"use client";

import {
  formatLocalDate,
  getGroupPetState,
  getPetMessage,
  type GroupProgress,
  type PetMood,
  petMoodLabels,
  type PetStage,
  petStageLabels,
} from "@habit-tracker/domain";
import { type CSSProperties, useId } from "react";

import styles from "./group-pet.module.css";

// Mascota del grupo (C6, docs/product/MASCOTA_GRUPO.md): un pulpito genérico
// dibujado en SVG. La misma geometría está en la app móvil
// (`apps/mobile/src/components/groups/group-pet-card.tsx`).

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

function Eyes({ mood }: { mood: PetMood }) {
  if (mood === "contenta" || mood === "dormida") {
    const curve = mood === "contenta" ? -8 : 6;
    return (
      <g stroke={faceColor} strokeWidth={3} strokeLinecap="round" fill="none">
        {[48, 72].map((x) => (
          <path key={x} d={`M ${x - 6} 51 Q ${x} ${51 + curve} ${x + 6} 51`} />
        ))}
      </g>
    );
  }
  const pupilY = mood === "triste" ? 53 : 51;
  return (
    <>
      <g className={styles.eyes}>
        {[48, 72].map((x) => (
          <g key={x}>
            <circle cx={x} cy={50} r={7.5} fill="#FFFFFF" />
            <circle cx={x + 1} cy={pupilY} r={4} fill={faceColor} />
            <circle cx={x + 2.5} cy={pupilY - 1.5} r={1.4} fill="#FFFFFF" />
          </g>
        ))}
      </g>
      {mood === "triste" ? (
        <g stroke={faceColor} strokeWidth={2.5} strokeLinecap="round">
          <path d="M 41 43 L 53 39" />
          <path d="M 67 39 L 79 43" />
        </g>
      ) : null}
    </>
  );
}

function Mouth({ mood }: { mood: PetMood }) {
  if (mood === "hambrienta") {
    return <ellipse cx={60} cy={65} rx={4} ry={5} fill={faceColor} />;
  }
  const d = {
    contenta: "M 53 62 Q 60 70 67 62",
    triste: "M 53 67 Q 60 61 67 67",
    dormida: "M 56 64 L 64 64",
  }[mood];
  return (
    <path d={d} stroke={faceColor} strokeWidth={3} strokeLinecap="round" fill="none" />
  );
}

export function PetArt({
  stage,
  mood,
  label,
}: {
  stage: PetStage;
  mood: PetMood;
  label: string;
}) {
  const scale = stageScale[stage];
  const colors = moodColors[mood];
  const hasSpots = stage === "joven" || stage === "adulta";

  return (
    <svg
      className={`${styles.art} ${styles[mood]}`}
      viewBox="0 0 120 120"
      role="img"
      aria-label={label}
    >
      <g transform={`translate(60 114) scale(${scale}) translate(-60 -114)`}>
        <g className={styles.body}>
          {tentacles.map(({ x, dir }, index) => (
            <path
              key={x}
              className={styles.tentacle}
              style={{ animationDelay: `${index * -0.3}s` } as CSSProperties}
              d={tentaclePath(x, dir)}
              stroke={colors.fill}
              strokeWidth={8}
              strokeLinecap="round"
              fill="none"
            />
          ))}
          <ellipse
            cx={60}
            cy={48}
            rx={32}
            ry={30}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={2}
          />
          {hasSpots ? (
            <g fill="#FFFFFF" opacity={0.35}>
              <circle cx={44} cy={31} r={4} />
              <circle cx={76} cy={29} r={3} />
              <circle cx={63} cy={23} r={2.5} />
            </g>
          ) : null}
          {stage === "adulta" ? (
            <polygon
              points="47,21 51,8 57,16 60,5 63,16 69,8 73,21"
              fill="#FACC15"
              stroke="#CA8A04"
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          ) : null}
          <g fill="#FF6B8B" opacity={0.45}>
            <ellipse cx={38} cy={60} rx={5} ry={3} />
            <ellipse cx={82} cy={60} rx={5} ry={3} />
          </g>
          <Eyes mood={mood} />
          <Mouth mood={mood} />
        </g>
        {mood === "dormida" ? (
          <g fill={colors.stroke} fontWeight={700} fontFamily="inherit">
            <text className={styles.zzz} x={88} y={30} fontSize={12}>
              z
            </text>
            <text
              className={styles.zzz}
              style={{ animationDelay: "-1.2s" } as CSSProperties}
              x={97}
              y={18}
              fontSize={16}
            >
              Z
            </text>
          </g>
        ) : null}
      </g>
    </svg>
  );
}

function daysLabel(count: number) {
  return count === 1 ? "1 día" : `${count} días`;
}

export function GroupPetCard({ progress }: { progress: GroupProgress }) {
  const titleId = useId();
  const state = getGroupPetState(progress);
  const stageLabel = petStageLabels[state.stage];
  const moodLabel = petMoodLabels[state.mood];

  return (
    <article className={`card ${styles.card}`} aria-labelledby={titleId}>
      <PetArt
        stage={state.stage}
        mood={state.mood}
        label={`Pulpito del grupo, etapa ${stageLabel}, ${moodLabel.toLowerCase()}`}
      />
      <div className={styles.info}>
        <div className={styles.heading}>
          <h2 id={titleId}>Pulpito</h2>
          <span className="quiet-badge">{stageLabel}</span>
          <span className={state.mood === "contenta" ? "positive-pill" : "quiet-badge"}>
            {moodLabel}
          </span>
        </div>
        <p className={styles.message}>{getPetMessage(state)}</p>
        <p className={styles.stats}>
          Racha {daysLabel(state.currentStreak)} · Mejor {daysLabel(state.bestStreak)}
          {state.nextStage
            ? ` · Crece a ${petStageLabels[state.nextStage.stage]} con ${daysLabel(state.nextStage.remainingDays)} más de racha`
            : " · Ya es adulta"}
        </p>
        <ol className={styles.days} aria-label="Comidas de los últimos 7 días">
          {state.last7Days.map((day) => {
            const date = formatLocalDate(day.date, {
              weekday: "short",
              day: "numeric",
            });
            const status = !day.counted
              ? "sin hábitos"
              : day.fed
                ? "comió"
                : "no comió";
            return (
              <li
                key={day.date}
                className={`${styles.day} ${day.fed ? styles.fed : day.counted ? styles.missed : styles.neutral}`}
                title={`${date}: ${status}`}
              >
                <span className="sr-only">
                  {date}: {status}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </article>
  );
}
