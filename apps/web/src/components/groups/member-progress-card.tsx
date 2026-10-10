"use client";

import {
  formatLocalDate,
  getMemberTodayStatus,
  getSharedHabitStatus,
  type GroupMemberProgress,
  type SharedHabit,
} from "@habit-tracker/domain";
import { type CSSProperties, useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";

type MemberProgressCardProps = {
  member: GroupMemberProgress;
  /** Solo en la tarjeta propia: marca o desmarca el hábito hoy. */
  onToggleToday?: (habitId: string) => void;
  pendingHabitId?: string | null;
};

export function memberTitle(member: GroupMemberProgress): string {
  const name = member.displayName ?? "Miembro";
  return `${name}${member.isMe ? " (tú)" : ""}${member.role === "owner" ? " · dueño" : ""}`;
}

function daysLabel(completed: number, active: number) {
  return `${completed} de ${active} ${active === 1 ? "día" : "días"}`;
}

function WeekStrip({ habit, today }: { habit: SharedHabit; today: string }) {
  const status = getSharedHabitStatus(habit, today);
  return (
    <span className="week-strip">
      <span className="week-strip__days" aria-hidden="true">
        {status.last7Days.map((day) => (
          <span
            key={day.date}
            className={`week-strip__day ${day.completed ? "is-done" : ""} ${day.active ? "" : "is-inactive"}`}
            title={formatLocalDate(day.date, { weekday: "short", day: "numeric" })}
          />
        ))}
      </span>
      <span className="week-strip__text">
        {daysLabel(status.completedInLast7, status.activeInLast7)} · últimos 7 días
      </span>
    </span>
  );
}

export function MemberProgressCard({
  member,
  onToggleToday,
  pendingHabitId,
}: MemberProgressCardProps) {
  const titleId = useId();
  const today = getMemberTodayStatus(member);

  return (
    <article className="card group-card member-card" aria-labelledby={titleId}>
      <div className="section-heading">
        <h2 id={titleId}>{memberTitle(member)}</h2>
        {today.sharesHabits ? (
          <span className={today.upToDate ? "positive-pill" : "quiet-badge"}>
            {today.upToDate
              ? "Al día"
              : `${today.completedToday} de ${today.activeToday} hoy`}
          </span>
        ) : null}
      </div>
      {member.habits.length ? (
        <ul className="member-habits">
          {member.habits.map((habit) => {
            const status = getSharedHabitStatus(habit, member.today);
            const style = { "--habit-color": habit.color } as CSSProperties;
            const streak = `racha ${status.streak.current}`;
            if (member.isMe && habit.habitId && onToggleToday) {
              const habitId = habit.habitId;
              return (
                <li
                  key={habitId}
                  className="member-habit member-habit--own"
                  style={style}
                >
                  <Checkbox
                    label={habit.name}
                    description={`${status.completedToday ? "Hecho hoy" : "Pendiente hoy"} · ${streak}`}
                    color={habit.color}
                    checked={status.completedToday}
                    disabled={!status.activeToday || pendingHabitId === habitId}
                    onChange={() => onToggleToday(habitId)}
                  />
                  <WeekStrip habit={habit} today={member.today} />
                </li>
              );
            }
            return (
              <li
                key={`${habit.name}-${habit.startDate}`}
                className="member-habit"
                style={style}
              >
                <div className="member-habit__row">
                  <span className="member-habit__dot" aria-hidden="true" />
                  <strong>{habit.name}</strong>
                  <span
                    className={`member-habit__today ${status.completedToday ? "is-done" : ""}`}
                  >
                    {status.activeToday
                      ? status.completedToday
                        ? "✓ hecho hoy"
                        : "✗ pendiente hoy"
                      : "sin día hoy"}
                  </span>
                  <span className="member-habit__streak">{streak}</span>
                </div>
                <WeekStrip habit={habit} today={member.today} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="group-muted">Aún no comparte hábitos.</p>
      )}
    </article>
  );
}
