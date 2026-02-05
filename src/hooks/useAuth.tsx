import { useEffect, useState, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
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
  
  const isInitializing = useRef(true);
  const hasSetInitialSession = useRef(false);

  useEffect(() => {
    // Set up auth state listener FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only process after initial session is set to avoid race conditions
        if (!hasSetInitialSession.current && event !== "INITIAL_SESSION") {
          return;
        }
        
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        });
        isInitializing.current = false;
      }
    );

    // THEN check for existing session (single source of truth)
    supabase.auth.getSession().then(({ data: { session } }) => {
      hasSetInitialSession.current = true;
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      });
      isInitializing.current = false;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    initialized: state.initialized,
    signOut,
  };
}