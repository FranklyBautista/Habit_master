import type { Database, Json } from "@habit-tracker/database";
import {
  type GroupInvitation,
  groupInvitationSchema,
  type GroupProgress,
  groupProgressSchema,
  type GroupSummary,
  groupSummarySchema,
  type InviteResult,
  inviteResultSchema,
} from "@habit-tracker/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mismo contrato que apps/web/src/lib/supabase-group-repository.ts. Toda la
// lectura y escritura de grupos pasa por las RPC `security definer` de la
// migración 20261010120000 (ADR 0002): las tablas de grupos no tienen permisos
// para clientes. Las RPC devuelven snake_case; aquí se pasa a camelCase y se
// valida con los esquemas del dominio en el límite.

const genericError = "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.";

/** La RPC respondió `42501`: no eres miembro (o dueño) de ese grupo. */
export class GroupAccessError extends Error {
  constructor(message = "No formas parte de este grupo.") {
    super(message);
    this.name = "GroupAccessError";
  }
}

type RpcError = { code?: string; message?: string };

// Las funciones de grupos lanzan sus errores con `P0001`/`42501` y un mensaje
// en español pensado para la app. Cualquier otro error (red, restricción de
// Postgres en inglés) se sustituye por un mensaje genérico.
function toGroupError(error: RpcError): Error {
  if (error.code === "42501") return new GroupAccessError(error.message || undefined);
  if (error.code === "P0001" && error.message) return new Error(error.message);
  return new Error(genericError);
}

type JsonObject = { [key: string]: Json | undefined };

function asObject(value: Json | undefined): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asArray(value: Json | undefined): Json[] {
  return Array.isArray(value) ? value : [];
}

function mapProgress(raw: Json): GroupProgress {
  const group = asObject(raw);
  return groupProgressSchema.parse({
    id: group.id,
    name: group.name,
    myRole: group.my_role,
    members: asArray(group.members).map((value) => {
      const member = asObject(value);
      return {
        memberId: member.member_id,
        displayName: member.display_name ?? null,
        role: member.role,
        isMe: member.is_me,
        today: member.today,
        habits: asArray(member.habits).map((habitValue) => {
          const habit = asObject(habitValue);
          return {
            habitId: habit.habit_id ?? null,
            name: habit.name,
            color: habit.color,
            icon: habit.icon,
            startDate: habit.start_date,
            archivePeriods: asArray(habit.archive_periods).map((periodValue) => {
              const period = asObject(periodValue);
              return { from: period.from, to: period.to };
            }),
            checkinDates: asArray(habit.checkin_dates),
          };
        }),
      };
    }),
    pendingInvitations: asArray(group.pending_invitations).map((value) => {
      const invitation = asObject(value);
      return {
        id: invitation.id,
        userCode: invitation.user_code,
        expiresAt: invitation.expires_at,
      };
    }),
  });
}

export class SupabaseGroupRepository {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async getOverview(): Promise<{
    groups: GroupSummary[];
    invitations: GroupInvitation[];
    userCode: string;
    /** Valor crudo de `profiles.display_name` (null si nunca se eligió). */
    displayName: string | null;
  }> {
    const [groupsResult, invitationsResult, profileResult] = await Promise.all([
      this.client.rpc("get_my_groups"),
      this.client.rpc("get_my_invitations"),
      this.client
        .from("profiles")
        .select("user_code, display_name")
        .eq("id", this.userId)
        .maybeSingle(),
    ]);
    if (groupsResult.error) throw toGroupError(groupsResult.error);
    if (invitationsResult.error) throw toGroupError(invitationsResult.error);
    if (profileResult.error) throw toGroupError(profileResult.error);
    if (!profileResult.data) throw new Error("No se encontró tu perfil.");

    return {
      groups: (groupsResult.data ?? []).map((row) =>
        groupSummarySchema.parse({
          id: row.id,
          name: row.name,
          role: row.role,
          memberCount: row.member_count,
          joinedAt: row.joined_at,
        }),
      ),
      invitations: (invitationsResult.data ?? []).map((row) =>
        groupInvitationSchema.parse({
          id: row.id,
          groupId: row.group_id,
          groupName: row.group_name,
          inviterName: row.inviter_name ?? null,
          memberCount: row.member_count,
          expiresAt: row.expires_at,
        }),
      ),
      userCode: profileResult.data.user_code,
      displayName: profileResult.data.display_name ?? null,
    };
  }

  async getProgress(groupId: string): Promise<GroupProgress> {
    const { data, error } = await this.client.rpc("get_group_progress", {
      group_id: groupId,
    });
    if (error) throw toGroupError(error);
    return mapProgress(data);
  }

  async createGroup(
    name: string,
    habitIds: string[],
    displayName?: string,
  ): Promise<string> {
    const { data, error } = await this.client.rpc("create_group", {
      group_name: name,
      habit_ids: habitIds,
      ...(displayName ? { new_display_name: displayName } : {}),
    });
    if (error) throw toGroupError(error);
    return data;
  }

  async renameGroup(groupId: string, name: string): Promise<void> {
    const { error } = await this.client.rpc("rename_group", {
      group_id: groupId,
      group_name: name,
    });
    if (error) throw toGroupError(error);
  }

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await this.client.rpc("delete_group", { group_id: groupId });
    if (error) throw toGroupError(error);
  }

  async inviteToGroup(groupId: string, userCode: string): Promise<InviteResult> {
    const { data, error } = await this.client.rpc("invite_to_group", {
      group_id: groupId,
      user_code: userCode,
    });
    if (error) throw toGroupError(error);
    return inviteResultSchema.parse(data);
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await this.client.rpc("cancel_invitation", {
      invitation_id: invitationId,
    });
    if (error) throw toGroupError(error);
  }

  async respondInvitation(
    invitationId: string,
    accept: boolean,
    habitIds: string[] = [],
    displayName?: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("respond_invitation", {
      invitation_id: invitationId,
      accept,
      habit_ids: habitIds,
      ...(displayName ? { new_display_name: displayName } : {}),
    });
    if (error) throw toGroupError(error);
  }

  async setSharedHabits(groupId: string, habitIds: string[]): Promise<void> {
    const { error } = await this.client.rpc("set_shared_habits", {
      group_id: groupId,
      habit_ids: habitIds,
    });
    if (error) throw toGroupError(error);
  }

  async removeMember(groupId: string, memberId: string): Promise<void> {
    const { error } = await this.client.rpc("remove_member", {
      group_id: groupId,
      member_id: memberId,
    });
    if (error) throw toGroupError(error);
  }

  async transferOwnership(groupId: string, memberId: string): Promise<void> {
    const { error } = await this.client.rpc("transfer_ownership", {
      group_id: groupId,
      member_id: memberId,
    });
    if (error) throw toGroupError(error);
  }

  async leaveGroup(groupId: string): Promise<void> {
    const { error } = await this.client.rpc("leave_group", { group_id: groupId });
    if (error) throw toGroupError(error);
  }

  async regenerateUserCode(): Promise<string> {
    const { data, error } = await this.client.rpc("regenerate_user_code");
    if (error) throw toGroupError(error);
    return data;
  }
}
