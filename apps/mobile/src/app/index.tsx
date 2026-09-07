import { Redirect } from "expo-router";

import { useSession } from "@/lib/auth/session-provider";

export default function Index() {
  const { session, loading } = useSession();
  if (loading) return null;
  return <Redirect href={session ? "/(app)" : "/(auth)/login"} />;
}
