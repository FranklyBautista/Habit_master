import {
  displayNameSchema,
  type GroupInvitation,
  groupNameSchema,
  type GroupProgress,
  type GroupSummary,
  type InviteResult,
  isValidUserCode,
} from "@habit-tracker/domain";
import NetInfo from "@react-native-community/netinfo";
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
import { AppState } from "react-native";

import { supabase } from "@/lib/supabase/client";

import { GroupAccessError, SupabaseGroupRepository } from "./supabase-group-repository";

// Mismo contrato que apps/web/src/lib/group-store.tsx. Igual que habit-store:
// sin UI optimista (ADR 0001) — cada acción espera al servidor y después vuelve
// a pedir el estado completo. Revalida con AppState/NetInfo en vez de los
// eventos "focus"/"online" de la ventana.

export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };

export type GroupsSnapshot = {
  hydrated: boolean;
  syncing: boolean;
  error: string | null;
  groups: GroupSummary[];
  invitations: GroupInvitation[];
  userCode: string | null;
  /** Valor crudo de `profiles.display_name`; ver `isPlaceholderDisplayName`. */
  displayName: string | null;
  /** Sube tras cada mutación con éxito; `useGroupProgress` reconsulta al cambiar. */
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

const genericError = "No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.";

// Para crear o unirse a un grupo hace falta nombre visible (ADR 0002 §2). Si el
// perfil no lo tiene (o tiene el "Tú" de relleno, ver `isPlaceholderDisplayName`
// del dominio) el servidor responde con este mensaje y la pantalla pide el nombre.
export function isDisplayNameRequiredError(message: string): boolean {
  return message.startsWith("Elige un nombre visible");
}

function errorMessage(reason: unknown) {
  if (reason instanceof Error && reason.message) return reason.message;
  return genericError;
}

function invalid(error: string): Promise<ActionResult<never>> {
  return Promise.resolve({ ok: false, error });
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
  const repository = useMemo(
    () => new SupabaseGroupRepository(supabase, userId),
    [userId],
  );
  // Solo la consulta más reciente puede escribir el snapshot: una revalidación
  // lanzada antes que la re-consulta de una mutación no debe pisarla al llegar
  // tarde (mismo patrón que habit-store).
  const requestIdRef = useRef(0);
  const wasOnlineRef = useRef(true);
  const inFlight = useRef(new Map<string, Promise<ActionResult<unknown>>>());

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
        error: errorMessage(reason),
      }));
      return false;
    }
  }, [repository]);

  // Espera la escritura, vuelve a pedir el overview y sube `revision` para que
  // las vistas de grupo abiertas también reconsulten. Un fallo de la re-consulta
  // no convierte la escritura (ya confirmada) en error: queda en `error`.
  const mutate = useCallback(
    <T,>(key: string, operation: () => Promise<T>): Promise<ActionResult<T>> => {
      const pending = inFlight.current.get(key);
      if (pending) return pending as Promise<ActionResult<T>>;

      const run = (async (): Promise<ActionResult<T>> => {
        let data: T;
        try {
          data = await operation();
        } catch (reason) {
          return { ok: false, error: errorMessage(reason) };
        }
        await refresh();
        setSnapshot((current) => ({ ...current, revision: current.revision + 1 }));
        return { ok: true, data };
      })().finally(() => {
        inFlight.current.delete(key);
      });
      inFlight.current.set(key, run);
      return run;
    },
    [refresh],
  );

  const actions = useMemo<GroupActions>(
    () => ({
      refresh,
      createGroup({ name, habitIds, displayName }) {
        const parsedName = groupNameSchema.safeParse(name);
        if (!parsedName.success) return invalid(parsedName.error.issues[0].message);
        let parsedDisplayName: string | undefined;
        if (displayName !== undefined) {
          const parsed = displayNameSchema.safeParse(displayName);
          if (!parsed.success) return invalid(parsed.error.issues[0].message);
          parsedDisplayName = parsed.data;
        }
        return mutate(`create:${parsedName.data}`, () =>
          repository.createGroup(parsedName.data, habitIds, parsedDisplayName),
        );
      },
      renameGroup(groupId, name) {
        const parsed = groupNameSchema.safeParse(name);
        if (!parsed.success) return invalid(parsed.error.issues[0].message);
        return mutate(`rename:${groupId}`, () =>
          repository.renameGroup(groupId, parsed.data),
        );
      },
      deleteGroup(groupId) {
        return mutate(`delete:${groupId}`, () => repository.deleteGroup(groupId));
      },
      inviteToGroup(groupId, userCode) {
        if (!isValidUserCode(userCode)) return invalid("Código no válido.");
        return mutate(`invite:${groupId}:${userCode}`, () =>
          repository.inviteToGroup(groupId, userCode),
        );
      },
      cancelInvitation(invitationId) {
        return mutate(`cancel:${invitationId}`, () =>
          repository.cancelInvitation(invitationId),
        );
      },
      respondInvitation({ invitationId, accept, habitIds = [], displayName }) {
        let parsedDisplayName: string | undefined;
        if (accept && displayName !== undefined) {
          const parsed = displayNameSchema.safeParse(displayName);
          if (!parsed.success) return invalid(parsed.error.issues[0].message);
          parsedDisplayName = parsed.data;
        }
        return mutate(`respond:${invitationId}`, () =>
          repository.respondInvitation(
            invitationId,
            accept,
            accept ? habitIds : [],
            parsedDisplayName,
          ),
        );
      },
      setSharedHabits(groupId, habitIds) {
        return mutate(`share:${groupId}`, () =>
          repository.setSharedHabits(groupId, habitIds),
        );
      },
      removeMember(groupId, memberId) {
        return mutate(`remove:${groupId}:${memberId}`, () =>
          repository.removeMember(groupId, memberId),
        );
      },
      transferOwnership(groupId, memberId) {
        return mutate(`transfer:${groupId}`, () =>
          repository.transferOwnership(groupId, memberId),
        );
      },
      leaveGroup(groupId) {
        return mutate(`leave:${groupId}`, () => repository.leaveGroup(groupId));
      },
      regenerateUserCode() {
        return mutate("regenerate-code", () => repository.regenerateUserCode());
      },
    }),
    [mutate, refresh, repository],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false;
      // Solo al recuperar la conexión, no en cada cambio de red.
      if (online && !wasOnlineRef.current) void refresh();
      wasOnlineRef.current = online;
    });
    return () => {
      appStateSubscription.remove();
      netInfoUnsubscribe();
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

export function useGroupProgress(groupId: string): {
  progress: GroupProgress | null;
  loading: boolean;
  error: string | null;
  notMember: boolean;
  refresh(): Promise<void>;
} {
  const { repository, snapshot } = useGroupStoreContext();
  const { revision } = snapshot;
  const [state, setState] = useState<{
    groupId: string;
    progress: GroupProgress | null;
    loading: boolean;
    error: string | null;
    notMember: boolean;
  }>({ groupId, progress: null, loading: true, error: null, notMember: false });
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setState((current) =>
      current.groupId === groupId
        ? { ...current, loading: true, error: null }
        : { groupId, progress: null, loading: true, error: null, notMember: false },
    );
    try {
      const progress = await repository.getProgress(groupId);
      if (requestIdRef.current !== requestId) return;
      setState({ groupId, progress, loading: false, error: null, notMember: false });
    } catch (reason) {
      if (requestIdRef.current !== requestId) return;
      if (reason instanceof GroupAccessError) {
        setState({
          groupId,
          progress: null,
          loading: false,
          error: null,
          notMember: true,
        });
        return;
      }
      setState((current) => ({
        ...current,
        groupId,
        loading: false,
        error: errorMessage(reason),
      }));
    }
  }, [groupId, repository]);

  useEffect(() => {
    void refresh();
  }, [refresh, revision]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (appState) => {
      if (appState === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const current =
    state.groupId === groupId
      ? state
      : { progress: null, loading: true, error: null, notMember: false };
  return {
    progress: current.progress,
    loading: current.loading,
    error: current.error,
    notMember: current.notMember,
    refresh,
  };
}
