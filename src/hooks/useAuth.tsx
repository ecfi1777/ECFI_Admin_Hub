import { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo, ReactNode } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false,
  });

  const mountedRef = useRef(true);
  const initializationComplete = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const markInitialized = (session: Session | null) => {
      if (!mountedRef.current || initializationComplete.current) return;
      console.log("[useAuth] markInitialized, hasSession:", !!session);
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      });
      initializationComplete.current = true;
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;
        console.log("[useAuth] onAuthStateChange:", event, !!session);

        if (event === "SIGNED_OUT") {
          setState({
            session: null,
            user: null,
            loading: false,
            initialized: true,
          });
          initializationComplete.current = true;
          return;
        }

        if (!initializationComplete.current) {
          markInitialized(session);
        } else {
          // Subsequent updates (token refresh, sign-in, etc.)
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            loading: false,
          }));
        }
      }
    );

    // Also try getSession as backup
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[useAuth] getSession resolved:", !!session, "initComplete:", initializationComplete.current);
      if (mountedRef.current && !initializationComplete.current) {
        markInitialized(session);
      }
    }).catch((error) => {
      console.error("[useAuth] getSession error:", error);
      if (mountedRef.current && !initializationComplete.current) {
        markInitialized(null);
      }
    });

    // Absolute fallback
    const absoluteFallback = setTimeout(() => {
      if (mountedRef.current && !initializationComplete.current) {
        console.warn("[useAuth] Fallback triggered");
        markInitialized(null);
      }
    }, 3000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(absoluteFallback);
    };
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    user: state.user,
    session: state.session,
    loading: state.loading,
    initialized: state.initialized,
    signOut,
  }), [state.user, state.session, state.loading, state.initialized, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
