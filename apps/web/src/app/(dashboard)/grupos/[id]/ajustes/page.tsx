"use client";

import {
  formatUserCode,
  groupLimits,
  type GroupMemberProgress,
  groupNameSchema,
} from "@habit-tracker/domain";
import { ArrowLeft, Crown, LogOut, Trash2, UserMinus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { ConfirmDialog } from "@/components/groups/confirm-dialog";
import { expiresInLabel } from "@/components/groups/group-utils";
import { InviteForm } from "@/components/groups/invite-form";
import { memberTitle } from "@/components/groups/member-progress-card";
import { NotMemberState } from "@/components/groups/not-member-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import {
  type ActionResult,
  useGroupActions,
  useGroupProgress,
} from "@/lib/group-store";

type Pending =
  | { kind: "remove"; member: GroupMemberProgress }
  | { kind: "transfer"; member: GroupMemberProgress }
  | { kind: "leave" }
  | { kind: "delete" };

export default function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { progress, loading, error, notMember, refresh } = useGroupProgress(id);
  const actions = useGroupActions();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (notMember) return <NotMemberState />;

  if (!progress) {
    return loading ? (
      <div
        className="loading-stack"
        aria-busy="true"
        aria-label="Cargando ajustes del grupo"
      >
        <Skeleton className="skeleton--title" />
        <Skeleton className="skeleton--card" />
      </div>
    ) : (
      <Card className="state-card state-card--error" role="alert">
        <div>
          <h2>No pudimos cargar el grupo</h2>
          <p>{error ?? "Revisa tu conexión e inténtalo de nuevo."}</p>
          <Button variant="secondary" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      </Card>
    );
  }

  const group = progress;
  const isOwner = group.myRole === "owner";
  const others = group.members.filter((member) => !member.isMe);
  const ownerMustTransfer = isOwner && others.length > 0;

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    const parsed = groupNameSchema.safeParse(name);
    if (!parsed.success) {
      setRenameError(parsed.error.issues[0]?.message ?? "Revisa el nombre.");
      return;
    }
    const result = await actions.renameGroup(group.id, parsed.data);
    if (!result.ok) {
      setRenameError(result.error);
      return;
    }
    setRenameError(null);
    setToast("Nombre del grupo actualizado.");
  }

  async function cancelInvitation(invitationId: string) {
    const result = await actions.cancelInvitation(invitationId);
    if (!result.ok) {
      setCancelError(result.error);
      return;
    }
    setCancelError(null);
    setToast("Invitación cancelada.");
  }

  function open(next: Pending) {
    setDialogError(null);
    setConfirmName("");
    setPending(next);
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    let result: ActionResult;
    switch (pending.kind) {
      case "remove":
        result = await actions.removeMember(group.id, pending.member.memberId);
        break;
      case "transfer":
        result = await actions.transferOwnership(group.id, pending.member.memberId);
        break;
      case "leave":
        result = await actions.leaveGroup(group.id);
        break;
      case "delete":
        result = await actions.deleteGroup(group.id);
        break;
    }
    setBusy(false);
    if (!result.ok) {
      setDialogError(result.error);
      return;
    }
    const kind = pending.kind;
    setPending(null);
    if (kind === "leave" || kind === "delete") {
      router.push("/grupos");
      return;
    }
    setToast(
      kind === "remove"
        ? "Miembro expulsado."
        : "Ahora esa persona es la dueña del grupo.",
    );
  }

  const dialog = (() => {
    if (!pending) return null;
    switch (pending.kind) {
      case "remove":
        return {
          title: `¿Expulsar a ${pending.member.displayName ?? "este miembro"}?`,
          description:
            "Perderá el acceso al grupo al instante y se dejará de ver lo que compartía. Podrás volver a invitarle.",
          label: "Expulsar",
          variant: "danger" as const,
        };
      case "transfer":
        return {
          title: `¿Hacer dueño a ${pending.member.displayName ?? "este miembro"}?`,
          description:
            "Podrá invitar, expulsar y borrar el grupo. Tú seguirás como miembro.",
          label: "Hacer dueño",
          variant: "primary" as const,
        };
      case "leave":
        return {
          title: "¿Salir del grupo?",
          description:
            others.length === 0
              ? "Eres el único miembro: al salir, el grupo se borrará."
              : "Dejarás de ver el grupo y se borrará lo que compartías en él. Tus hábitos no cambian.",
          label: "Salir del grupo",
          variant: "danger" as const,
        };
      case "delete":
        return {
          title: "¿Borrar el grupo?",
          description: `Se borrará para todos los miembros. Escribe «${group.name}» para confirmar.`,
          label: "Borrar grupo",
          variant: "danger" as const,
        };
    }
  })();

  return (
    <>
      <PageHeader
        eyebrow="Ajustes del grupo"
        title={group.name}
        description={
          isOwner ? "Eres el dueño de este grupo." : "Eres miembro de este grupo."
        }
      />
      <nav className="group-toolbar" aria-label="Volver">
        <Link
          className="button button--ghost button--default"
          href={`/grupos/${group.id}`}
        >
          <ArrowLeft size={17} /> Volver al grupo
        </Link>
      </nav>
      <div className="view-grid group-settings">
        {isOwner ? (
          <Card className="group-card">
            <form className="group-rename" onSubmit={rename} key={group.name}>
              <FormField htmlFor="group-rename" label="Nombre del grupo">
                <div className="invite-form__row">
                  <input
                    id="group-rename"
                    name="name"
                    defaultValue={group.name}
                    maxLength={60}
                    required
                  />
                  <Button type="submit" variant="secondary">
                    Guardar
                  </Button>
                </div>
              </FormField>
              {renameError ? (
                <p className="form-error" role="alert">
                  {renameError}
                </p>
              ) : null}
            </form>
          </Card>
        ) : null}
        <Card className="group-card" aria-labelledby="members-title">
          <h2 id="members-title" className="group-subtitle">
            Miembros ({group.members.length}/{groupLimits.maxMembers})
          </h2>
          <ul className="group-member-list">
            {group.members.map((member) => (
              <li key={member.memberId}>
                <span>{memberTitle(member)}</span>
                {isOwner && !member.isMe ? (
                  <span className="group-member-list__actions">
                    <Button
                      variant="ghost"
                      onClick={() => open({ kind: "transfer", member })}
                    >
                      <Crown size={16} /> Hacer dueño
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => open({ kind: "remove", member })}
                    >
                      <UserMinus size={16} /> Expulsar
                    </Button>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
        {isOwner ? (
          <Card className="group-card" aria-labelledby="pending-title">
            <h2 id="pending-title" className="group-subtitle">
              Invitaciones pendientes
            </h2>
            {group.pendingInvitations.length ? (
              <ul className="group-member-list">
                {group.pendingInvitations.map((invitation) => (
                  <li key={invitation.id}>
                    <span>
                      <span className="user-code user-code--small">
                        {formatUserCode(invitation.userCode)}
                      </span>{" "}
                      {expiresInLabel(invitation.expiresAt)}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => void cancelInvitation(invitation.id)}
                      aria-label={`Cancelar la invitación a ${formatUserCode(invitation.userCode)}`}
                    >
                      Cancelar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="group-muted">No hay invitaciones pendientes.</p>
            )}
            {cancelError ? (
              <p className="form-error" role="alert">
                {cancelError}
              </p>
            ) : null}
            <InviteForm groupId={group.id} />
          </Card>
        ) : null}
        <Card className="group-card" aria-labelledby="leave-title">
          <h2 id="leave-title" className="group-subtitle">
            Salir
          </h2>
          {ownerMustTransfer ? (
            <p className="group-muted" id="leave-note">
              Eres el dueño: antes de salir, haz dueño a otro miembro.
            </p>
          ) : null}
          <div className="group-actions">
            <Button
              variant="secondary"
              onClick={() => open({ kind: "leave" })}
              disabled={ownerMustTransfer}
              aria-describedby={ownerMustTransfer ? "leave-note" : undefined}
            >
              <LogOut size={17} /> Salir del grupo
            </Button>
            {isOwner ? (
              <Button variant="danger" onClick={() => open({ kind: "delete" })}>
                <Trash2 size={17} /> Borrar grupo
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
      {dialog ? (
        <ConfirmDialog
          open
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.label}
          variant={dialog.variant}
          busy={busy}
          error={dialogError}
          confirmDisabled={
            pending?.kind === "delete" && confirmName.trim() !== group.name
          }
          onConfirm={() => void confirm()}
          onClose={() => setPending(null)}
        >
          {pending?.kind === "delete" ? (
            <FormField htmlFor="confirm-group-name" label="Nombre del grupo">
              <input
                id="confirm-group-name"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                autoComplete="off"
              />
            </FormField>
          ) : null}
        </ConfirmDialog>
      ) : null}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </>
  );
}
