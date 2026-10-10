import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useGroupActions } from "@/lib/group-store";

import { inviteResultMessage } from "./group-format";
import { GroupButton, GroupTextField } from "./group-ui";

// Invitar con el código de usuario (ADR 0002 §1). El servidor responde igual a
// un código con mal formato que a uno inexistente ("Código no válido.").
export function InviteForm({ groupId }: { groupId: string }) {
  const actions = useGroupActions();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function invite() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await actions.inviteToGroup(groupId, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage(inviteResultMessage(result.data, code));
    if (result.data === "sent") setCode("");
  }

  return (
    <View style={styles.form}>
      <GroupTextField
        label="Código de la persona"
        value={code}
        onChangeText={(text) => {
          setCode(text);
          setError(null);
        }}
        placeholder="XXXX-XXXX"
        hint="Pídele su código: lo ve en Ajustes."
        error={error}
        maxLength={12}
        autoCapitalize="characters"
      />
      <GroupButton
        label="Invitar"
        busyLabel="Invitando…"
        busy={busy}
        disabled={!code.trim()}
        onPress={() => void invite()}
      />
      {message ? (
        <ThemedText
          type="small"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.two },
});
