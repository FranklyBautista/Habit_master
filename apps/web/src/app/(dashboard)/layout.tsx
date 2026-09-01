import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { SupabaseHabitRepository } from "@/lib/supabase-habit-repository";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const initialState = await new SupabaseHabitRepository(supabase, user.id).getState();
  return (
    <AppShell initialState={initialState} userId={user.id} userEmail={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
