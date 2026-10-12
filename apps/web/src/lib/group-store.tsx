"use client";

import {
  displayNameSchema,
  type GroupInvitation,
  groupNameSchema,
  type GroupProgress,
  type GroupSummary,
  type InviteResult,
  isValidUserCode,
} from "@habit-tracker/domain";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import { createClient } from "./supabase/client";
import { GroupAccessError, SupabaseGroupRepository } from "./supabase-group-repository";

// Estado de grupos (ADR 0002), separado del de hábitos: se carga aparte y no
// retrasa Hoy. Sigue ADR 0001: cada acción espera al servidor y después vuelve
// a pedir el resumen completo; nunca se muestra un cambio antes de confirmarlo.

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };

/** Mensaje del servidor cuando falta el nombre visible. */
export const missingDisplayNameError =
  "Elige un nombre visible de 1 a 60 caracteres para unirte a un grupo.";

export type GroupsSnapshot = {
  hydrated: boolean;
  syncing: boolean;
  error: string | null;
  groups: GroupSummary[];
  invitations: GroupInvitation[];
  userCode: string | null;
  /**
   * `profiles.display_name` tal cual. Si `isPlaceholderDisplayName` (dominio)
   * es true, hay que pedir "Tu nombre en el grupo" antes de crear o unirse.
   */
  displayName: string | null;
  /** Sube con cada acción confirmada; `useGroupProgress` vuelve a consultar. */
  revision: number;
};

type GroupActions = {
  refresh(): Promise<boolean>;
  createGroup(input: {
    name: string;
    habitIds: string[];
    displayName?: string;
  }): Promise<ActionResult<string>>;
  renameGroup(groupId: string, name: string): Promise<ActionResult>;
  deleteGroup(groupId: string): Promise<ActionResult>;
  inviteToGroup(groupId: string, userCode: string): Promise<ActionResult<InviteResult>>;
  cancelInvitation(invitationId: string): Promise<ActionResult>;
  respondInvitation(input: {
    invitationId: string;
    accept: boolean;
    habitIds?: string[];
    displayName?: string;
  }): Promise<ActionResult>;
  setSharedHabits(groupId: string, habitIds: string[]): Promise<ActionResult>;
  removeMember(groupId: string, memberId: string): Promise<ActionResult>;
  transferOwnership(groupId: string, memberId: string): Promise<ActionResult>;
  leaveGroup(groupId: string): Promise<ActionResult>;
  regenerateUserCode(): Promise<ActionResult<string>>;
};

type GroupStoreValue = {
  snapshot: GroupsSnapshot;
  actions: GroupActions;
  repository: SupabaseGroupRepository;
};

const GroupStoreContext = createContext<GroupStoreValue | null>(null);

const groupIdSchema = z.uuid();

const genericError = "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.";
const duplicateError = "Ya se está procesando. Espera un momento.";

export function groupErrorMessage(reason: unknown) {
  // Los errores de las RPC llegan con el mensaje en español del servidor; un
  // fallo de red (`TypeError: Failed to fetch`) o de validación no.
  if (reason instanceof GroupAccessError) return reason.message;
  if (reason instanceof Error && reason.name === "Error" && reason.message) {
    return reason.message;
  }
  return genericError;
}

function firstIssue(result: {
  success: false;
  error: { issues: { message: string }[] };
}) {
  return result.error.issues[0]?.message ?? "Revisa los datos.";
}

export function GroupStoreProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string;
}) {
  const [snapshot, setSnapshot] = useState<GroupsSnapshot>({
    hydrated: false,
    syncing: false,
    error: null,
    groups: [],
    invitations: [],
    userCode: null,
    displayName: null,
    revision: 0,
  });
  // Igual que habit-store: solo la última consulta iniciada puede escribir el
  // estado, para que una revalidación lenta no pise una más reciente.
  const requestIdRef = useRef(0);
  // Acciones en curso por clave: un doble clic no envía dos invitaciones.
  const pendingActions = useRef(new Set<string>());
  const repository = useMemo(
    () => new SupabaseGroupRepository(createClient(), userId),
    [userId],
  );

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setSnapshot((current) => ({ ...current, syncing: true, error: null }));
    try {
      const overview = await repository.getOverview();
      if (requestIdRef.current !== requestId) return true;
      setSnapshot((current) => ({
        ...current,
        ...overview,
        hydrated: true,
        syncing: false,
        error: null,
      }));
      return true;
    } catch (reason) {
      if (requestIdRef.current !== requestId) return false;
      setSnapshot((current) => ({
        ...current,
        syncing: false,
        error: groupErrorMessage(reason),
      }));
      return false;
    }
  }, [repository]);

  const run = useCallback(
    async <T,>(key: string, operation: () => Promise<T>): Promise<ActionResult<T>> => {
      if (pendingActions.current.has(key)) return { ok: false, error: duplicateError };
      pendingActions.current.add(key);
      try {
        let data: T;
        try {
          data = await operation();
        } catch (reason) {
          return { ok: false, error: groupErrorMessage(reason) };
        }
        // La escritura ya está confirmada; el resumen se vuelve a pedir y la
        // revisión avisa a las vistas de grupo abiertas.
        setSnapshot((current) => ({ ...current, revision: current.revision + 1 }));
        await refresh();
        return { ok: true, data };
      } finally {
        pendingActions.current.delete(key);
      }
    },
    [refresh],
  );

  const actions = useMemo<GroupActions>(
    () => ({
      refresh,
      async createGroup({ name, habitIds, displayName }) {
        const parsedName = groupNameSchema.safeParse(name);
        if (!parsedName.success) return { ok: false, error: firstIssue(parsedName) };
        let parsedDisplayName: string | undefined;
        if (displayName !== undefined) {
          const result = displayNameSchema.safeParse(displayName);
          if (!result.success) return { ok: false, error: firstIssue(result) };
          parsedDisplayName = result.data;
        }
        return run("create-group", () =>
          repository.createGroup(parsedName.data, habitIds, parsedDisplayName),
        );
      },
      async renameGroup(groupId, name) {
        const parsedName = groupNameSchema.safeParse(name);
        if (!parsedName.success) return { ok: false, error: firstIssue(parsedName) };
        return run(`rename:${groupId}`, () =>
          repository.renameGroup(groupId, parsedName.data),
        );
      },
      deleteGroup(groupId) {
        return run(`delete:${groupId}`, () => repository.deleteGroup(groupId));
      },
      async inviteToGroup(groupId, userCode) {
        if (!isValidUserCode(userCode))
          return { ok: false, error: "Código no válido." };
        return run(`invite:${groupId}`, () =>
          repository.inviteToGroup(groupId, userCode),
        );
      },
      cancelInvitation(invitationId) {
        return run(`cancel:${invitationId}`, () =>
          repository.cancelInvitation(invitationId),
        );
      },
      async respondInvitation({ invitationId, accept, habitIds, displayName }) {
        let parsedDisplayName: string | undefined;
        if (accept && displayName !== undefined) {
          const result = displayNameSchema.safeParse(displayName);
          if (!result.success) return { ok: false, error: firstIssue(result) };
          parsedDisplayName = result.data;
        }
        return run(`respond:${invitationId}`, () =>
          repository.respondInvitation(
            invitationId,
            accept,
            accept ? habitIds : undefined,
            parsedDisplayName,
          ),
        );
      },
      setSharedHabits(groupId, habitIds) {
        return run(`share:${groupId}`, () =>
          repository.setSharedHabits(groupId, habitIds),
        );
      },
      removeMember(groupId, memberId) {
        return run(`member:${groupId}`, () =>
          repository.removeMember(groupId, memberId),
        );
      },
      transferOwnership(groupId, memberId) {
        return run(`member:${groupId}`, () =>
          repository.transferOwnership(groupId, memberId),
        );
      },
      leaveGroup(groupId) {
        return run(`leave:${groupId}`, () => repository.leaveGroup(groupId));
      },
      regenerateUserCode() {
        return run("user-code", () => repository.regenerateUserCode());
      },
    }),
    [refresh, repository, run],
  );

  useEffect(() => {
    void refresh();
    const revalidate = () => void refresh();
    window.addEventListener("focus", revalidate);
    window.addEventListener("online", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", revalidate);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ snapshot, actions, repository }),
    [actions, repository, snapshot],
  );

  return (
    <GroupStoreContext.Provider value={value}>{children}</GroupStoreContext.Provider>
  );
}

function useGroupStoreContext() {
  const context = useContext(GroupStoreContext);
  if (!context) throw new Error("GroupStoreProvider no está disponible.");
  return context;
}

export function useGroups() {
  return useGroupStoreContext().snapshot;
}

export function useGroupActions() {
  return useGroupStoreContext().actions;
}

/** Repositorio compartido, para hooks de una sola vista (por ejemplo el chat). */
export function useGroupRepository() {
  return useGroupStoreContext().repository;
}

type ProgressState = {
  progress: GroupProgress | null;
  loading: boolean;
  error: string | null;
  notMember: boolean;
};

/**
 * Progreso de un grupo. Se vuelve a pedir al montar, al cambiar `revision`
 * (tras cualquier acción de grupos) y al volver a la pestaña o a la red.
 */
export function useGroupProgress(groupId: string) {
  const { repository, snapshot } = useGroupStoreContext();
  const { revision } = snapshot;
  const [state, setState] = useState<ProgressState>({
    progress: null,
    loading: true,
    error: null,
    notMember: false,
  });
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    // Un id mal formado (URL editada a mano) se trata igual que un grupo ajeno,
    // sin enviar a Postgres algo que respondería con un error en inglés.
    if (!groupIdSchema.safeParse(groupId).success) {
      setState({ progress: null, loading: false, error: null, notMember: true });
      return;
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const progress = await repository.getProgress(groupId);
      if (requestIdRef.current !== requestId) return;
      setState({ progress, loading: false, error: null, notMember: false });
    } catch (reason) {
      if (requestIdRef.current !== requestId) return;
      if (reason instanceof GroupAccessError) {
        setState({ progress: null, loading: false, error: null, notMember: true });
        return;
      }
      setState((current) => ({
        ...current,
        loading: false,
        error: groupErrorMessage(reason),
      }));
    }
  }, [groupId, repository]);

  useEffect(() => {
    void refresh();
  }, [refresh, revision]);

  useEffect(() => {
    const revalidate = () => void refresh();
    window.addEventListener("focus", revalidate);
    window.addEventListener("online", revalidate);
    return () => {
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", revalidate);
    };
  }, [refresh]);

  return { ...state, refresh };
}
