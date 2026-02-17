import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export function useAuth() {
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
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      });
      initializationComplete.current = true;
    };

    // Set up auth state listener FIRST — it may fire before getSession resolves
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;
        
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
          // This is our first signal — use it to initialize
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

    // Also try getSession for cases where onAuthStateChange doesn't fire quickly
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mountedRef.current && !initializationComplete.current) {
        markInitialized(session);
      }
    }).catch((error) => {
      console.error("Auth initialization error:", error);
      if (mountedRef.current && !initializationComplete.current) {
        markInitialized(null);
      }
    });

    // Absolute fallback: if nothing fires within 3s, unblock the UI
    const absoluteFallback = setTimeout(() => {
      if (mountedRef.current && !initializationComplete.current) {
        console.warn("Auth initialization timed out (absolute fallback)");
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

  return useMemo(() => ({
    user: state.user,
    session: state.session,
    loading: state.loading,
    initialized: state.initialized,
    signOut,
  }), [state.user, state.session, state.loading, state.initialized, signOut]);
}
