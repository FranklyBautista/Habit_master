"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { useGroups } from "@/lib/group-store";

import { membersLabel } from "./group-utils";

/** Acceso a grupos desde Hoy (wireframe "Hoy con acceso a grupos"). */
export function GroupsTodayCard() {
  const { hydrated, groups, invitations } = useGroups();
  if (!hydrated) return null;

  const pending = invitations.length;
  const hasContent = groups.length > 0 || pending > 0;

  return (
    <Card className="group-card groups-today-card" aria-labelledby="groups-today-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Grupos</span>
          <h2 id="groups-today-title">
            {hasContent ? "Tus grupos" : "Comparte hábitos con tu gente"}
          </h2>
        </div>
        {pending ? (
          <span className="positive-pill">
            {pending === 1 ? "1 invitación nueva" : `${pending} invitaciones nuevas`}
          </span>
        ) : (
          <Users size={21} aria-hidden="true" />
        )}
      </div>
      {hasContent ? (
        <>
          {groups.length ? (
            <ul className="groups-today-list">
              {groups.slice(0, 3).map((group) => (
                <li key={group.id}>
                  <Link href={`/grupos/${group.id}`}>
                    <span>{group.name}</span>
                    <small>{membersLabel(group.memberCount)}</small>
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          <Link className="button button--secondary button--default" href="/grupos">
            {pending ? "Ver invitaciones" : "Ver grupos"}
          </Link>
        </>
      ) : (
        <>
          <p className="group-muted">
            Crea un grupo, elige qué hábitos compartes y anímense entre todos.
          </p>
          <Link
            className="button button--secondary button--default"
            href="/grupos/nuevo"
          >
            Crear un grupo
          </Link>
        </>
      )}
    </Card>
  );
}
