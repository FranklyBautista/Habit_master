import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Component/hook tests run under jsdom. React Native / Expo modules that the
// unit under test pulls in (react-native, NetInfo, expo-secure-store, the
// Supabase client) are replaced per-file with `vi.mock`; nothing here loads the
// native runtime. Path aliases (`@/*`) come from tsconfig.json.
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
