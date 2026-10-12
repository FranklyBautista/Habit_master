"use client";

import {
  countMessageCharacters,
  formatGroupMessageTime,
  groupChatLimits,
} from "@habit-tracker/domain";
import { CloudOff, SendHorizontal } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";

import { NotMemberState } from "@/components/groups/not-member-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGroupChat } from "@/lib/group-chat";

import styles from "./group-chat.module.css";

const inputId = "group-chat-message";
const counterId = "group-chat-message-count";

/**
 * Chat de un grupo (C5, wireframe "Chat del grupo"). Monta `useGroupChat`:
 * el padre debe darle `key={groupId}`.
 */
export function GroupChat({
  groupId,
  timezone,
}: {
  groupId: string;
  timezone: string;
}) {
  const chat = useGroupChat(groupId);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  // Último mensaje visible al terminar la primera carga: lo anterior no se
  // anuncia a los lectores de pantalla, solo lo que llega después.
  const [baselineId, setBaselineId] = useState<string | null | undefined>(undefined);
  const listRef = useRef<HTMLOListElement>(null);

  const lastMessage = chat.messages.at(-1);
  if (baselineId === undefined && !chat.loading) setBaselineId(lastMessage?.id ?? null);

  // Al llegar un mensaje nuevo (no al cargar anteriores) se baja al final.
  const lastId = lastMessage?.id;
  useEffect(() => {
    const list = listRef.current;
    if (list && lastId) list.scrollTop = list.scrollHeight;
  }, [lastId]);

  if (chat.notMember) return <NotMemberState />;

  const length = countMessageCharacters(draft);
  const over = length > groupChatLimits.maxMessageLength;
  const latestFromOthers = [...chat.messages]
    .reverse()
    .find((message) => !message.isMine);
  const announcement =
    latestFromOthers && baselineId !== undefined && latestFromOthers.id !== baselineId
      ? `Nuevo mensaje de ${latestFromOthers.authorName}: ${latestFromOthers.body}`
      : "";
  const now = new Date(chat.checkedAt);
  const canWrite = chat.online && !chat.sending;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canWrite || over) return;
    setSendError(null);
    const result = await chat.send(draft);
    if (result.ok) setDraft("");
    else setSendError(result.error);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Intro envía; Mayús+Intro (o una composición IME en curso) no.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <Card className={styles.chat} aria-label="Chat del grupo">
      {chat.error && chat.messages.length > 0 ? (
        <div className="sync-error" role="alert">
          <span>{chat.error}</span>
          <Button variant="secondary" onClick={() => void chat.refresh()}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {chat.hasMore ? (
        <Button
          variant="ghost"
          className={styles.loadOlder}
          onClick={() => void chat.loadOlder()}
          disabled={chat.loadingOlder}
        >
          {chat.loadingOlder ? "Cargando…" : "Cargar anteriores"}
        </Button>
      ) : null}

      {chat.loading ? (
        <div className="loading-stack" aria-busy="true" aria-label="Cargando mensajes">
          <Skeleton className="skeleton--card" />
          <Skeleton className="skeleton--card" />
        </div>
      ) : chat.error && chat.messages.length === 0 ? (
        <div className="state-card state-card--error" role="alert">
          <div>
            <h2>No pudimos cargar los mensajes</h2>
            <p>{chat.error}</p>
            <Button variant="secondary" onClick={() => void chat.refresh()}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : chat.messages.length === 0 ? (
        <p className={styles.empty}>Aún no hay mensajes. Escribe el primero.</p>
      ) : (
        <ol
          ref={listRef}
          className={styles.messages}
          aria-label="Mensajes"
          tabIndex={0}
        >
          {chat.messages.map((message) => (
            <li
              key={message.id}
              className={`${styles.message} ${message.isMine ? styles.mine : ""}`}
            >
              <div className={styles.meta}>
                <span className={styles.author}>
                  {message.isMine ? "Tú" : message.authorName}
                </span>
                <time dateTime={message.createdAt}>
                  {formatGroupMessageTime(message.createdAt, now, timezone)}
                </time>
              </div>
              <p className={styles.body}>{message.body}</p>
            </li>
          ))}
        </ol>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <form className={styles.composer} onSubmit={(event) => void submit(event)}>
        {!chat.online ? (
          <p className="group-note" role="status">
            <CloudOff size={15} aria-hidden="true" /> Sin conexión. Podrás escribir
            cuando vuelvas a estar en línea.
          </p>
        ) : null}
        <label className="sr-only" htmlFor={inputId}>
          Mensaje
        </label>
        <div className={styles.composerRow}>
          <textarea
            id={inputId}
            rows={2}
            value={draft}
            placeholder="Escribe un mensaje…"
            aria-describedby={counterId}
            aria-invalid={over || undefined}
            disabled={!chat.online}
            onChange={(event) => {
              setDraft(event.target.value);
              setSendError(null);
            }}
            onKeyDown={onKeyDown}
          />
          <Button
            type="submit"
            size="icon"
            aria-label={chat.sending ? "Enviando mensaje" : "Enviar mensaje"}
            disabled={!canWrite || over || length === 0}
          >
            <SendHorizontal size={19} />
          </Button>
        </div>
        <div className={styles.composerFooter}>
          <span id={counterId} className={over ? styles.over : undefined}>
            {length}/{groupChatLimits.maxMessageLength}
            {over ? " · Demasiado largo" : ""}
          </span>
          <span aria-hidden="true">Intro envía · Mayús+Intro, nueva línea</span>
        </div>
        {sendError ? (
          <p className="form-error" role="alert">
            {sendError}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
