import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return (stored as Theme) || "dark";
  });
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Apply theme class + persist to localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Load theme from profile on auth
  useEffect(() => {
    let cancelled = false;

    const loadTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const { data } = await supabase
        .from("profiles")
        .select("theme")
        .eq("user_id", session.user.id)
        .single();

      if (!cancelled && data?.theme && (data.theme === "dark" || data.theme === "light")) {
        setThemeState(data.theme as Theme);
      }
      if (!cancelled) setProfileLoaded(true);
    };

    loadTheme();
    return () => { cancelled = true; };
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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
