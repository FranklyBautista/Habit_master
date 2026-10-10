"use client";

import { type GroupInvitation, groupLimits } from "@habit-tracker/domain";
import { ChevronRight, Inbox, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { expiresInLabel, membersLabel } from "@/components/groups/group-utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useGroupActions, useGroups } from "@/lib/group-store";

export default function GroupsPage() {
  const snapshot = useGroups();
  const actions = useGroupActions();
  const [toast, setToast] = useState<string | null>(null);
  const atLimit = snapshot.groups.length >= groupLimits.maxGroupsPerUser;

  return (
    <>
      <PageHeader
        eyebrow="Juntos"
        title="Grupos"
        description="Comparte algunos hábitos con tu gente y anímense entre todos."
      />
      {snapshot.error ? (
        <div className="sync-error" role="alert">
          <span>{snapshot.error}</span>
          <Button variant="secondary" onClick={() => void actions.refresh()}>
            Reintentar
          </Button>
        </div>
      ) : null}
      {!snapshot.hydrated ? (
        <div className="loading-stack" aria-busy="true" aria-label="Cargando grupos">
          <Skeleton className="skeleton--card" />
          <Skeleton className="skeleton--card" />
        </div>
      ) : (
        <div className="view-grid groups-layout">
          {snapshot.invitations.length ? (
            <section aria-labelledby="invitations-title" className="group-section">
              <h2 id="invitations-title">
                Invitaciones ({snapshot.invitations.length})
              </h2>
              <ul className="group-list">
                {snapshot.invitations.map((invitation) => (
                  <InvitationRow
                    key={invitation.id}
                    invitation={invitation}
                    onDeclined={() => setToast("Invitación rechazada.")}
                  />
                ))}
              </ul>
            </section>
          ) : null}
          <section aria-labelledby="my-groups-title" className="group-section">
            <div className="section-heading">
              <h2 id="my-groups-title">
                Tus grupos ({snapshot.groups.length}/{groupLimits.maxGroupsPerUser})
              </h2>
              {atLimit ? (
                <Button disabled aria-describedby="group-limit-note">
                  <Plus size={18} /> Crear
                </Button>
              ) : (
                <Link
                  className="button button--primary button--default"
                  href="/grupos/nuevo"
                >
                  <Plus size={18} /> Crear
                </Link>
              )}
            </div>
            {atLimit ? (
              <p id="group-limit-note" className="group-muted">
                Ya estás en {groupLimits.maxGroupsPerUser} grupos, el máximo. Sal de uno
                para crear otro.
              </p>
            ) : null}
            {snapshot.groups.length ? (
              <ul className="group-list">
                {snapshot.groups.map((group) => (
                  <li key={group.id}>
                    <Link className="card group-link" href={`/grupos/${group.id}`}>
                      <span className="group-link__icon" aria-hidden="true">
                        <Users size={19} />
                      </span>
                      <span className="group-link__copy">
                        <strong>{group.name}</strong>
                        <small>
                          {membersLabel(group.memberCount)}
                          {group.role === "owner" ? " · eres el dueño" : ""}
                        </small>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="empty-page-state">
                <span className="state-icon">
                  <Inbox size={23} />
                </span>
                <h3>Todavía no estás en ningún grupo</h3>
                <p>
                  Crea uno y comparte solo los hábitos que elijas. Los demás verán el
                  nombre y los días completados, nada más de tu cuenta.
                </p>
              </Card>
            )}
          </section>
        </div>
      )}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}

function InvitationRow({
  invitation,
  onDeclined,
}: {
  invitation: GroupInvitation;
  onDeclined: () => void;
}) {
  const actions = useGroupActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decline() {
    setBusy(true);
    const result = await actions.respondInvitation({
      invitationId: invitation.id,
      accept: false,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDeclined();
  }

  return (
    <li className="card group-card invitation-card">
      <p>
        <strong>{invitation.inviterName ?? "Alguien"}</strong> te invita a{" "}
        <strong>«{invitation.groupName}»</strong>
      </p>
      <p className="group-muted">
        {membersLabel(invitation.memberCount)} · {expiresInLabel(invitation.expiresAt)}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="group-actions">
        <Button variant="secondary" onClick={() => void decline()} disabled={busy}>
          Rechazar
        </Button>
        <Link
          className="button button--primary button--default"
          href={`/grupos/invitaciones/${invitation.id}`}
        >
          Ver y unirme
        </Link>
      </div>
    </li>
  );
}
