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
    
    // Get initial session first, then set up listener
    // This prevents race conditions and ensures we have the session before any events fire
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mountedRef.current) return;
        
        // Mark as initialized with the initial session
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        });
        initializationComplete.current = true;
      } catch (error) {
        console.error("Auth initialization error:", error);
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

    // Set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;
        
        // Skip INITIAL_SESSION events - we handle that with getSession
        if (event === "INITIAL_SESSION") return;
        
        // Only process events after initialization is complete
        // This prevents double-updates during startup
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
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    // State will be updated by onAuthStateChange
  }, []);

  // Memoize return value to prevent unnecessary re-renders in consumers
  return useMemo(() => ({
    user: state.user,
    session: state.session,
    loading: state.loading,
    initialized: state.initialized,
    signOut,
  }), [state.user, state.session, state.loading, state.initialized, signOut]);
}
