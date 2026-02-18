import { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext, ReactNode } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

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

    // Fallback: unblock UI if auth stalls (Firefox, slow networks)
    const timeoutId = setTimeout(() => {
      if (!mountedRef.current || initializationComplete.current) return;
      console.warn("Auth initialization timeout – unblocking UI");
      setState(prev => ({ ...prev, loading: false, initialized: true }));
      initializationComplete.current = true;
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;
        
        clearTimeout(timeoutId);

        // Clear stale cached data on auth boundary transitions.
        // SIGNED_OUT / failed refresh → full wipe.
        // SIGNED_IN → full wipe so stale "no orgs" cache from a previous
        //   failed session doesn't route the user to onboarding.
        // Successful TOKEN_REFRESHED → invalidate so queries re-run with new token.
        if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
          queryClient.clear();
          localStorage.removeItem("ecfi_active_organization_id");
        } else if (event === "SIGNED_IN") {
          queryClient.clear();
        } else if (event === "TOKEN_REFRESHED" && session) {
          queryClient.invalidateQueries();
        }

        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        });
        initializationComplete.current = true;
      }
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [queryClient]);

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
