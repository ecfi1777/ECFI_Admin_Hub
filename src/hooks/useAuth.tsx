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
    
    // Unified initialization function
    const initializeAuth = async () => {
      if (initializationComplete.current) return;
      
      try {
        // Use a 2-second timeout for the session fetch itself
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 800)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!mountedRef.current || initializationComplete.current) return;
        
        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          initialized: true,
        });
        initializationComplete.current = true;
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mountedRef.current && !initializationComplete.current) {
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!mountedRef.current) return;
        
        // Always handle sign-out immediately to ensure state is cleared
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

        // For other events, if not initialized, this might be our initial session
        if (!initializationComplete.current) {
          setState({
            session,
            user: session?.user ?? null,
            loading: false,
            initialized: true,
          });
          initializationComplete.current = true;
        } else {
          // Subsequent updates
          setState(prev => ({
            ...prev,
            session,
            user: session?.user ?? null,
            loading: false,
          }));
        }
      }
    );

    // Initial check
    initializeAuth();

    // Absolute fallback: if everything above fails to set initialized=true, do it after 4s
    const absoluteFallback = setTimeout(() => {
      if (mountedRef.current && !initializationComplete.current) {
        console.warn("Auth initialization timed out (absolute fallback)");
        setState(prev => ({
          ...prev,
          loading: false,
          initialized: true,
        }));
        initializationComplete.current = true;
      }
    }, 2000);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      clearTimeout(absoluteFallback);
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
