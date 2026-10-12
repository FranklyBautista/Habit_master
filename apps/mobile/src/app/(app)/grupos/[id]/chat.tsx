import { useLocalSearchParams } from "expo-router";

import { GroupChatView } from "@/components/groups/group-chat-view";
import { GroupScreen } from "@/components/groups/group-ui";
import { useGroups } from "@/lib/group-store";
import { useHabitStore } from "@/lib/habit-store";

export default function GrupoChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups } = useGroups();
  const { settings } = useHabitStore();
  const name = groups.find((group) => group.id === id)?.name;

  return (
    <GroupScreen title={name ? `${name} · Chat` : "Chat"} scrollable={false}>
      <GroupChatView key={id} groupId={id} timezone={settings.timezone} />
    </GroupScreen>
  );
}
