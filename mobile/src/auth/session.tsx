import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { isStaffRol } from "../../../lib/auth/staffAccess";

type SessionCtx = {
  accessToken: string | null;
  userId: string | null;
  rol: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("jugador").select("rol").eq("id", uid).single();
    setRol(data?.rol ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setAccessToken(s?.access_token ?? null);
      setUserId(s?.user?.id ?? null);
      if (s?.user?.id) loadProfile(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAccessToken(session?.access_token ?? null);
      setUserId(session?.user?.id ?? null);
      if (session?.user?.id) loadProfile(session.user.id);
      else setRol(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    const uid = data.user?.id;
    if (!uid) return "Error de sesión";
    const { data: jugador } = await supabase.from("jugador").select("rol").eq("id", uid).single();
    if (!isStaffRol(jugador?.rol)) {
      await supabase.auth.signOut();
      return "Esta app es solo para staff";
    }
    setRol(jugador?.rol ?? null);
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRol(null);
  }, []);

  const value = useMemo(
    () => ({ accessToken, userId, rol, loading, signIn, signOut }),
    [accessToken, userId, rol, loading, signIn, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}
