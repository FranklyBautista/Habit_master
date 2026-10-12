import {
  countMessageCharacters,
  formatGroupMessageTime,
  groupChatLimits,
  type GroupMessage,
} from "@habit-tracker/domain";
import { router } from "expo-router";
import { SendHorizontal } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useGroupChat } from "@/lib/group-chat";

import { FieldError, GroupButton, LoadingState, MessageState } from "./group-ui";

// Chat de un grupo (C5, wireframe "Chat del grupo"), mismo comportamiento que
// apps/web/src/components/groups/group-chat.tsx. La lista va invertida para que
// el final quede abajo y cargar anteriores no la haga saltar. Monta
// `useGroupChat`: la pantalla le da `key={groupId}`.
export function GroupChatView({
  groupId,
  timezone,
}: {
  groupId: string;
  timezone: string;
}) {
  const chat = useGroupChat(groupId);
  const theme = useTheme();
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  // Lo que ya estaba al terminar la primera carga no se anuncia.
  const [baselineId, setBaselineId] = useState<string | null | undefined>(undefined);

  const lastMessage = chat.messages.at(-1);
  if (baselineId === undefined && !chat.loading) setBaselineId(lastMessage?.id ?? null);
  const latestFromOthers = [...chat.messages].reverse().find((item) => !item.isMine);
  const announcement =
    latestFromOthers && baselineId !== undefined && latestFromOthers.id !== baselineId
      ? `Nuevo mensaje de ${latestFromOthers.authorName}: ${latestFromOthers.body}`
      : "";

  useEffect(() => {
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);

  if (chat.notMember) {
    return (
      <MessageState
        title="Ya no formas parte de este grupo."
        message="Puede que te hayan expulsado o que el grupo se haya borrado."
        actionLabel="Ir a Grupos"
        onAction={() => router.replace("/grupos")}
      />
    );
  }

  const length = countMessageCharacters(draft);
  const over = length > groupChatLimits.maxMessageLength;
  const canSend = chat.online && !chat.sending && !over && length > 0;
  const now = new Date(chat.checkedAt);

  async function submit() {
    if (!canSend) return;
    setSendError(null);
    const result = await chat.send(draft);
    if (result.ok) setDraft("");
    else setSendError(result.error);
  }

  function renderMessage({ item }: { item: GroupMessage }) {
    const time = formatGroupMessageTime(item.createdAt, now, timezone);
    const author = item.isMine ? "Tú" : item.authorName;
    return (
      <View
        accessible
        accessibilityLabel={`${author}, ${time}: ${item.body}`}
        style={[
          styles.bubble,
          item.isMine
            ? [styles.mine, { backgroundColor: theme.accentSoft }]
            : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        <View style={styles.meta}>
          <ThemedText type="smallBold">{author}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {time}
          </ThemedText>
        </View>
        <ThemedText>{item.body}</ThemedText>
      </View>
    );
  }

  let content;
  if (chat.loading) {
    content = <LoadingState />;
  } else if (chat.error && chat.messages.length === 0) {
    content = (
      <MessageState
        title="No se pudieron cargar los mensajes."
        message={chat.error}
        actionLabel="Reintentar"
        onAction={() => void chat.refresh()}
      />
    );
  } else if (chat.messages.length === 0) {
    content = (
      <MessageState title="Aún no hay mensajes." message="Escribe el primero." />
    );
  } else {
    content = (
      <FlatList
        inverted
        accessibilityLabel="Mensajes"
        data={[...chat.messages].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        // Con la lista invertida, el pie queda arriba, sobre el más antiguo.
        ListFooterComponent={
          chat.hasMore ? (
            <GroupButton
              label="Cargar anteriores"
              busyLabel="Cargando…"
              busy={chat.loadingOlder}
              variant="secondary"
              onPress={() => void chat.loadOlder()}
            />
          ) : null
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <View style={styles.flex}>{content}</View>
      {chat.error && chat.messages.length > 0 ? (
        <View style={styles.inlineError}>
          <FieldError message={chat.error} />
        </View>
      ) : null}
      <View style={[styles.composer, { borderColor: theme.border }]}>
        {!chat.online ? (
          <ThemedText
            type="small"
            themeColor="textSecondary"
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            Sin conexión. Podrás escribir cuando vuelvas a estar en línea.
          </ThemedText>
        ) : null}
        <View style={styles.row}>
          <TextInput
            accessibilityLabel="Mensaje"
            accessibilityHint={`Hasta ${groupChatLimits.maxMessageLength} caracteres`}
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              setSendError(null);
            }}
            editable={chat.online}
            multiline
            placeholder="Escribe un mensaje…"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: over ? theme.danger : theme.border,
                backgroundColor: theme.backgroundElement,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={chat.sending ? "Enviando mensaje" : "Enviar mensaje"}
            accessibilityState={{ disabled: !canSend, busy: chat.sending }}
            disabled={!canSend}
            onPress={() => void submit()}
            style={[
              styles.send,
              { backgroundColor: theme.accent },
              !canSend && styles.disabled,
            ]}
          >
            <SendHorizontal size={20} color={theme.onAccent} />
          </Pressable>
        </View>
        <ThemedText
          type="small"
          themeColor={over ? undefined : "textSecondary"}
          style={over ? { color: theme.danger } : undefined}
        >
          {length}/{groupChatLimits.maxMessageLength}
          {over ? " · Demasiado largo" : ""}
        </ThemedText>
        <FieldError message={sendError} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Spacing.two, padding: Spacing.three },
  bubble: {
    maxWidth: "85%",
    alignSelf: "flex-start",
    gap: 2,
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  mine: { alignSelf: "flex-end", borderColor: "transparent" },
  meta: { flexDirection: "row", gap: Spacing.two, alignItems: "baseline" },
  inlineError: { paddingHorizontal: Spacing.three },
  composer: {
    gap: Spacing.one,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  row: { flexDirection: "row", alignItems: "flex-end", gap: Spacing.two },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
});
