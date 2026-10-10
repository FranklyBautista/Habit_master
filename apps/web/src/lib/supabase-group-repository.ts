import type { Database } from "@habit-tracker/database";
import {
  type GroupInvitation,
  groupInvitationSchema,
  type GroupProgress,
  groupProgressSchema,
  type GroupSummary,
  groupSummarySchema,
  type InviteResult,
  inviteResultSchema,
  normalizeUserCode,
  userCodeSchema,
} from "@habit-tracker/domain";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Grupos de hábitos compartidos (ADR 0002). Las tablas de grupos no tienen
// permisos para clientes: todo pasa por las RPC `security definer` de la
// migración 20261010120000, que devuelven snake_case. Aquí se pasa a camelCase
// y se valida con los esquemas del dominio en el límite.

type GroupRow = Database["public"]["Functions"]["get_my_groups"]["Returns"][number];
type InvitationRow =
  Database["public"]["Functions"]["get_my_invitations"]["Returns"][number];

/** La RPC respondió 42501: quien llama no es miembro (o el grupo no existe). */
export class GroupAccessError extends Error {}

type RpcError = { code?: string; message?: string };

// Los RAISE de las funciones ya están en español; el 42501 se convierte en un
// error propio para que la vista del grupo distinga "ya no eres miembro".
function rpcError(error: RpcError): Error {
  if (error.code === "42501") {
    return new GroupAccessError(error.message || "No formas parte de este grupo.");
  }
  return new Error(error.message || "No se pudo completar la acción.");
}

function mapGroup(row: GroupRow): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    role: row.role as GroupSummary["role"],
    memberCount: row.member_count,
    joinedAt: row.joined_at,
  };
}

function mapInvitation(row: InvitationRow): GroupInvitation {
  return {
    id: row.id,
    groupId: row.group_id,
    groupName: row.group_name,
    inviterName: row.inviter_name,
    memberCount: row.member_count,
    expiresAt: row.expires_at,
  };
}

// Forma exacta del JSON de `get_group_progress` (snake_case).
const progressRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  my_role: z.string(),
  members: z.array(
    z.object({
      member_id: z.string(),
      display_name: z.string().nullable(),
      role: z.string(),
      is_me: z.boolean(),
      today: z.string(),
      habits: z.array(
        z.object({
          habit_id: z.string().nullable(),
          name: z.string(),
          color: z.string(),
          icon: z.string(),
          start_date: z.string(),
          archive_periods: z.array(z.object({ from: z.string(), to: z.string() })),
          checkin_dates: z.array(z.string()),
        }),
      ),
    }),
  ),
  pending_invitations: z.array(
    z.object({ id: z.string(), user_code: z.string(), expires_at: z.string() }),
  ),
});

function mapProgress(raw: unknown): GroupProgress {
  const row = progressRowSchema.parse(raw);
  return groupProgressSchema.parse({
    id: row.id,
    name: row.name,
    myRole: row.my_role,
    members: row.members.map((member) => ({
      memberId: member.member_id,
      displayName: member.display_name,
      role: member.role,
      isMe: member.is_me,
      today: member.today,
      habits: member.habits.map((habit) => ({
        habitId: habit.habit_id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        startDate: habit.start_date,
        archivePeriods: habit.archive_periods,
        checkinDates: habit.checkin_dates,
      })),
    })),
    pendingInvitations: row.pending_invitations.map((invitation) => ({
      id: invitation.id,
      userCode: invitation.user_code,
      expiresAt: invitation.expires_at,
    })),
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

    if (groupsResult.error) throw rpcError(groupsResult.error);
    if (invitationsResult.error) throw rpcError(invitationsResult.error);
    if (profileResult.error) throw profileResult.error;
    if (!profileResult.data) {
      throw new Error("No se encontró tu perfil. Recarga la página.");
    }

    return {
      groups: z
        .array(groupSummarySchema)
        .parse((groupsResult.data ?? []).map(mapGroup)),
      invitations: z
        .array(groupInvitationSchema)
        .parse((invitationsResult.data ?? []).map(mapInvitation)),
      userCode: userCodeSchema.parse(profileResult.data.user_code),
      displayName: profileResult.data.display_name,
    };
  }

  async getProgress(groupId: string): Promise<GroupProgress> {
    const { data, error } = await this.client.rpc("get_group_progress", {
      group_id: groupId,
    });
    if (error) throw rpcError(error);
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
      ...(displayName === undefined ? {} : { new_display_name: displayName }),
    });
    if (error) throw rpcError(error);
    return z.uuid().parse(data);
  }

  async renameGroup(groupId: string, name: string): Promise<void> {
    const { error } = await this.client.rpc("rename_group", {
      group_id: groupId,
      group_name: name,
    });
    if (error) throw rpcError(error);
  }

  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await this.client.rpc("delete_group", { group_id: groupId });
    if (error) throw rpcError(error);
  }

  async inviteToGroup(groupId: string, userCode: string): Promise<InviteResult> {
    const { data, error } = await this.client.rpc("invite_to_group", {
      group_id: groupId,
      user_code: normalizeUserCode(userCode),
    });
    if (error) throw rpcError(error);
    return inviteResultSchema.parse(data);
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await this.client.rpc("cancel_invitation", {
      invitation_id: invitationId,
    });
    if (error) throw rpcError(error);
  }

  async respondInvitation(
    invitationId: string,
    accept: boolean,
    habitIds?: string[],
    displayName?: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("respond_invitation", {
      invitation_id: invitationId,
      accept,
      ...(habitIds === undefined ? {} : { habit_ids: habitIds }),
      ...(displayName === undefined ? {} : { new_display_name: displayName }),
    });
    if (error) throw rpcError(error);
  }

  async setSharedHabits(groupId: string, habitIds: string[]): Promise<void> {
    const { error } = await this.client.rpc("set_shared_habits", {
      group_id: groupId,
      habit_ids: habitIds,
    });
    if (error) throw rpcError(error);
  }

  async removeMember(groupId: string, memberId: string): Promise<void> {
    const { error } = await this.client.rpc("remove_member", {
      group_id: groupId,
      member_id: memberId,
    });
    if (error) throw rpcError(error);
  }

  async transferOwnership(groupId: string, memberId: string): Promise<void> {
    const { error } = await this.client.rpc("transfer_ownership", {
      group_id: groupId,
      member_id: memberId,
    });
    if (error) throw rpcError(error);
  }

  async leaveGroup(groupId: string): Promise<void> {
    const { error } = await this.client.rpc("leave_group", { group_id: groupId });
    if (error) throw rpcError(error);
  }

  async regenerateUserCode(): Promise<string> {
    const { data, error } = await this.client.rpc("regenerate_user_code");
    if (error) throw rpcError(error);
    return userCodeSchema.parse(data);
  }
}
