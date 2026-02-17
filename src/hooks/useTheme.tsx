import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "dark" | "light";

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

  // Load theme from profile on auth state changes — NEVER block rendering
  useEffect(() => {
    let mounted = true;

    // Failsafe: force profileLoaded after 3s no matter what
    const failsafe = setTimeout(() => {
      if (mounted) setProfileLoaded(true);
    }, 3000);

    const loadThemeFromProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("theme")
          .eq("user_id", userId)
          .single();
        if (mounted && (data?.theme === "dark" || data?.theme === "light")) {
          setThemeState(data.theme as Theme);
        }
      } catch {
        // Theme fetch failed — not critical, continue
      } finally {
        if (mounted) setProfileLoaded(true);
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        loadThemeFromProfile(session.user.id);
      } else {
        setProfileLoaded(true);
      }
    }).catch(() => {
      if (mounted) setProfileLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        // Always set profileLoaded for ALL events
        if (event === "SIGNED_OUT") {
          setThemeState("dark");
          localStorage.removeItem("theme");
          setProfileLoaded(true);
          return;
        }

        if (session?.user) {
          loadThemeFromProfile(session.user.id);
        } else {
          setProfileLoaded(true);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  // Save to database when theme changes (after profile loaded)
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);

    // We use a non-blocking session check here
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

  // We no longer gate rendering on profileLoaded to prevent "black screen" issues.
  // The theme will apply as soon as it's resolved.

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
