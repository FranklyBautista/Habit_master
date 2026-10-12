"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { GroupChat } from "@/components/groups/group-chat";
import { PageHeader } from "@/components/page-header";
import { useGroups } from "@/lib/group-store";
import { useHabitStore } from "@/lib/habit-store";

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>();
  const { groups } = useGroups();
  const { settings } = useHabitStore();
  const name = groups.find((group) => group.id === id)?.name;

  return (
    <>
      <PageHeader
        eyebrow="Chat del grupo"
        title={name ?? "Chat"}
        description="Solo lo leen las personas que están en el grupo."
      />
      <nav className="group-toolbar" aria-label="Acciones del chat">
        <Link className="button button--ghost button--default" href={`/grupos/${id}`}>
          <ArrowLeft size={17} /> {name ? `Volver a ${name}` : "Volver al grupo"}
        </Link>
      </nav>
      <GroupChat key={id} groupId={id} timezone={settings.timezone} />
    </>
  );
}
