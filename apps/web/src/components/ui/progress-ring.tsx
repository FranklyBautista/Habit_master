import { type ReactNode } from "react";

type ProgressRingProps = {
  // 0–100; null = sin hábitos previstos (anillo vacío, sin 0 % ficticio).
  percentage: number | null;
  size?: number;
  strokeWidth?: number;
  /** Con nombre, el anillo se expone como `progressbar`; sin él es decorativo. */
  label?: string;
  valueText?: string;
  children?: ReactNode;
};

// Mismo anillo que apps/mobile/src/components/progress-ring.tsx: pista neutra,
// arco de acento con extremos redondeados que empieza arriba (las 12).
export function ProgressRing({
  percentage,
  size = 96,
  strokeWidth = 10,
  label,
  valueText,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, percentage ?? 0)) / 100;
  const center = size / 2;
  const accessibility =
    label && percentage !== null
      ? {
          role: "progressbar",
          "aria-label": label,
          "aria-valuemin": 0,
          "aria-valuemax": 100,
          "aria-valuenow": percentage,
          "aria-valuetext": valueText,
        }
      : {};

  return (
    <div
      className="progress-ring"
      style={{ width: size, height: size }}
      {...accessibility}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          className="progress-ring__track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {progress > 0 ? (
          <circle
            className="progress-ring__value"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - progress)}
            fill="none"
            transform={`rotate(-90 ${center} ${center})`}
          />
        ) : null}
      </svg>
      {children ? <div className="progress-ring__center">{children}</div> : null}
    </div>
  );
}
