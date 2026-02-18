import { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext, ReactNode } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
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

    // Fallback: unblock UI if getSession stalls (Firefox, slow networks)
    const forceInitialized = async () => {
      if (!mountedRef.current || initializationComplete.current) return;
      console.warn("Auth initialization timeout – clearing corrupted session data");

      // Wipe all local auth data to break out of corrupted token loops
      try { await supabase.auth.signOut({ scope: "local" }); } catch {}
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}

      if (!mountedRef.current) return;
      setState({ session: null, user: null, loading: false, initialized: true });
      initializationComplete.current = true;
    };
    const timeoutId = setTimeout(forceInitialized, 3000);

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;
        clearTimeout(timeoutId);
        
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        });
        initializationComplete.current = true;
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearTimeout(timeoutId);
        if (mountedRef.current) {
          setState({
            session: null,
            user: null,
            loading: false,
            initialized: true,
          });
          initializationComplete.current = true;
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;
        if (event === "INITIAL_SESSION") return;
        if (!initializationComplete.current) return;
        
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        });
      }
    );

    initializeAuth();

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
