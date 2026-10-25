import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";

import { clearQueue } from "@/lib/offline/checkin-queue";
import { clearCachedState } from "@/lib/offline/state-cache";
import { supabase } from "@/lib/supabase/client";

// Al cerrar sesión no deben quedar en el teléfono los hábitos ni los check-ins
// pendientes de esa cuenta (ADR 0003).
function clearOfflineData(userId: string) {
  Promise.all([clearCachedState(userId), clearQueue(userId)]).catch(
    (reason: unknown) => {
      console.warn("Could not clear offline data", reason);
    },
  );
}

type SessionContextValue = {
  session: Session | null;
  loading: boolean;
};

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userId: string | null = null;

    supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user.id ?? userId;
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" && userId) clearOfflineData(userId);
      userId = newSession?.user.id ?? null;
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
