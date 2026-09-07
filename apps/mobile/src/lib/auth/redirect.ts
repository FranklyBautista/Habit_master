import * as Linking from "expo-linking";

// Resolves to exp://<host>/--/auth/confirm?next=... under Expo Go during
// development, and to habittracker://auth/confirm?next=... in a standalone
// build — both handled by app/auth/confirm.tsx.
export function getMobileAuthRedirect(next: string): string {
  return Linking.createURL("/auth/confirm", { queryParams: { next } });
}
