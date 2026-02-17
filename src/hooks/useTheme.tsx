import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  profileLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return (stored as Theme) || "dark";
  });
  const [profileLoaded, setProfileLoaded] = useState(true);

  // Apply theme class + persist to localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Load theme from profile on auth state changes
  useEffect(() => {
    let mounted = true;

    // Immediately check session so we never block rendering
    const initTheme = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("theme")
            .eq("user_id", session.user.id)
            .single();
          if (mounted && (data?.theme === "dark" || data?.theme === "light")) {
            setThemeState(data.theme as Theme);
          }
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setProfileLoaded(true);
      }
    };
    initTheme();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setThemeState("dark");
          localStorage.removeItem("theme");
          setProfileLoaded(true);
          return;
        }

        if (
          (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
          session?.user
        ) {
          const { data } = await supabase
            .from("profiles")
            .select("theme")
            .eq("user_id", session.user.id)
            .single();

          if (data?.theme === "dark" || data?.theme === "light") {
            setThemeState(data.theme as Theme);
          }
          setProfileLoaded(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Save to database when theme changes (after profile loaded)
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from("profiles")
        .update({ theme: newTheme })
        .eq("user_id", session.user.id);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  if (!profileLoaded) {
    return (
      <div className="min-h-screen bg-neutral-950" />
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, profileLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
