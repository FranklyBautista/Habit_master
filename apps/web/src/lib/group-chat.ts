"use client";

import {
  createGroupMessageId,
  getOlderMessagesCursor,
  type GroupMessage,
  groupMessageBodySchema,
  type GroupMessagePage,
  mergeLatestGroupMessages,
  prependOlderGroupMessages,
} from "@habit-tracker/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  type ActionResult,
  groupErrorMessage,
  useGroupRepository,
} from "./group-store";
import { GroupAccessError } from "./supabase-group-repository";

// Chat de un grupo (C5). Igual que el resto de grupos sigue ADR 0001: enviar y
// borrar esperan al servidor y después se vuelve a pedir la página más
// reciente; un mensaje nunca aparece como enviado antes de confirmarse.

export type GroupChatState = {
  messages: GroupMessage[];
  /** Hay mensajes más antiguos que el primero cargado. */
  hasMore: boolean;
  /** Primera carga, sin mensajes que enseñar todavía. */
  loading: boolean;
  loadingOlder: boolean;
  error: string | null;
  /** El servidor respondió 42501: expulsión, salida o grupo borrado. */
  notMember: boolean;
  online: boolean;
  sending: boolean;
  deletingId: string | null;
};

const groupIdSchema = z.uuid();
const emptyWindow: GroupMessagePage = { messages: [], hasMore: false };

function newMessageId() {
  return createGroupMessageId(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Mensajes de un grupo. La vista lo monta con `key={groupId}`: al cambiar de
 * grupo se empieza de cero en vez de mezclar ventanas de mensajes.
 */
export function useGroupChat(groupId: string) {
  const repository = useGroupRepository();
  const [state, setState] = useState<GroupChatState>(() => ({
    messages: [],
    hasMore: false,
    loading: true,
    loadingOlder: false,
    error: null,
    notMember: false,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    sending: false,
    deletingId: null,
  }));
  const windowRef = useRef<GroupMessagePage>(emptyWindow);
  // Solo la consulta más reciente escribe el estado (mismo patrón que el store).
  const requestIdRef = useRef(0);
  const sendRef = useRef<Promise<ActionResult> | null>(null);
  // Si un envío falla (por ejemplo, por la red) y se reintenta el mismo texto,
  // se reutiliza el id: el servidor no lo duplicará si el primero sí llegó.
  const pendingSendRef = useRef<{ body: string; id: string } | null>(null);
  const deletingRef = useRef(new Set<string>());

  const applyWindow = useCallback((next: GroupMessagePage) => {
    windowRef.current = next;
    setState((current) => ({
      ...current,
      messages: next.messages,
      hasMore: next.hasMore,
      loading: false,
      error: null,
      notMember: false,
    }));
  }, []);

  const handleFailure = useCallback((reason: unknown) => {
    if (reason instanceof GroupAccessError) {
      windowRef.current = emptyWindow;
      setState((current) => ({
        ...current,
        messages: [],
        hasMore: false,
        loading: false,
        notMember: true,
        error: null,
      }));
      return;
    }
    setState((current) => ({
      ...current,
      loading: false,
      error: groupErrorMessage(reason),
    }));
  }, []);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    // Un id mal formado (URL editada a mano) no se envía a Postgres: la vista
    // lo trata como un grupo ajeno (ver `validGroupId` más abajo).
    if (!groupIdSchema.safeParse(groupId).success) return false;
    try {
      const latest = await repository.getMessages(groupId);
      if (requestIdRef.current !== requestId) return true;
      applyWindow(mergeLatestGroupMessages(windowRef.current, latest));
      return true;
    } catch (reason) {
      if (requestIdRef.current !== requestId) return false;
      handleFailure(reason);
      return false;
    }
  }, [applyWindow, groupId, handleFailure, repository]);

  const loadOlder = useCallback(async () => {
    const cursor = getOlderMessagesCursor(windowRef.current.messages);
    if (!cursor || !windowRef.current.hasMore) return;
    setState((current) => ({ ...current, loadingOlder: true }));
    try {
      const older = await repository.getMessages(groupId, cursor);
      applyWindow(prependOlderGroupMessages(windowRef.current, older));
    } catch (reason) {
      handleFailure(reason);
    } finally {
      setState((current) => ({ ...current, loadingOlder: false }));
    }
  }, [applyWindow, groupId, handleFailure, repository]);

  const send = useCallback(
    (draft: string): Promise<ActionResult> => {
      const parsed = groupMessageBodySchema.safeParse(draft);
      if (!parsed.success) {
        return Promise.resolve({
          ok: false,
          error: parsed.error.issues[0]?.message ?? "Revisa el mensaje.",
        });
      }
      // Doble clic o Intro repetido: se comparte el envío en curso.
      if (sendRef.current) return sendRef.current;

      const body = parsed.data;
      const id =
        pendingSendRef.current?.body === body
          ? pendingSendRef.current.id
          : newMessageId();
      pendingSendRef.current = { body, id };

      const run = (async (): Promise<ActionResult> => {
        setState((current) => ({ ...current, sending: true }));
        try {
          await repository.sendMessage(groupId, body, id);
        } catch (reason) {
          if (reason instanceof GroupAccessError) handleFailure(reason);
          return { ok: false, error: groupErrorMessage(reason) };
        } finally {
          setState((current) => ({ ...current, sending: false }));
        }
        pendingSendRef.current = null;
        await refresh();
        return { ok: true, data: undefined };
      })().finally(() => {
        sendRef.current = null;
      });
      sendRef.current = run;
      return run;
    },
    [groupId, handleFailure, refresh, repository],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<ActionResult> => {
      if (deletingRef.current.has(messageId)) {
        return { ok: false, error: "Ya se está borrando. Espera un momento." };
      }
      deletingRef.current.add(messageId);
      setState((current) => ({ ...current, deletingId: messageId }));
      try {
        await repository.deleteMessage(messageId);
      } catch (reason) {
        if (reason instanceof GroupAccessError) handleFailure(reason);
        return { ok: false, error: groupErrorMessage(reason) };
      } finally {
        deletingRef.current.delete(messageId);
        setState((current) => ({
          ...current,
          deletingId: current.deletingId === messageId ? null : current.deletingId,
        }));
      }
      await refresh();
      return { ok: true, data: undefined };
    },
    [handleFailure, refresh, repository],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const revalidate = () => void refresh();
    const goOnline = () => {
      setState((current) => ({ ...current, online: true }));
      void refresh();
    };
    const goOffline = () => setState((current) => ({ ...current, online: false }));
    window.addEventListener("focus", revalidate);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("focus", revalidate);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refresh]);

  const validGroupId = groupIdSchema.safeParse(groupId).success;
  return {
    ...state,
    loading: validGroupId && state.loading,
    notMember: !validGroupId || state.notMember,
    refresh,
    loadOlder,
    send,
    deleteMessage,
  };
}
