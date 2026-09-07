import type { Database } from "@habit-tracker/database";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import { getSupabaseEnvironment } from "./env";
import { LargeSecureStore } from "./large-secure-store";

const { url, publishableKey } = getSupabaseEnvironment();

export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // @supabase/supabase-js defaults to "implicit" (tokens in a URL #fragment),
    // unlike @supabase/ssr (used by apps/web) which defaults to "pkce". Mobile
    // deep links need "code" as a query param instead — app/auth/confirm.tsx
    // calls exchangeCodeForSession(code), matching apps/web's own confirm
    // route. Confirmed against local Supabase: without this, the recovery
    // email link redirected with access_token/refresh_token in the fragment
    // and no `code` at all.
    flowType: "pkce",
  },
});

// Supabase's refresh timer keeps running in the background otherwise, which
// wastes battery and can race with the OS suspending the app.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
