

## Fix ThemeProvider Auth-Aware Theme Loading

### Problem
The `loadTheme` effect in `ThemeProvider` uses an empty dependency array and a one-shot `getSession()` call. If the auth session hasn't resolved by mount time, the database theme is never fetched -- the provider never re-checks after login.

### Solution
Replace the one-shot `useEffect` (lines ~39-59 of `src/hooks/useTheme.tsx`) with a `supabase.auth.onAuthStateChange()` subscription:

- On `SIGNED_IN` or `TOKEN_REFRESHED`: fetch theme from `profiles` table, apply via `setThemeState()`, set `profileLoaded = true`.
- On `SIGNED_OUT`: reset to `"dark"`, clear localStorage theme, set `profileLoaded = true`.
- On `INITIAL_SESSION` with no session: set `profileLoaded = true` (no DB fetch needed).
- Return the `unsubscribe` function as cleanup.

### What stays the same
- `setTheme()` and `toggleTheme()` write logic -- untouched.
- `profileLoaded` gate and splash screen -- kept, just triggered by auth events instead of the one-shot fetch.
- localStorage read for initial state -- kept for instant non-flash default.

### Scope
Only `src/hooks/useTheme.tsx` is modified. No other files touched.

### Technical Detail

The current effect (lines 39-59):
```typescript
useEffect(() => {
  let cancelled = false;
  const loadTheme = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    // if no session yet, marks loaded and bails
    // never re-checks
  };
  loadTheme();
  return () => { cancelled = true; };
}, []);
```

Will be replaced with:
```typescript
useEffect(() => {
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
          setThemeState(data.theme);
        }
        setProfileLoaded(true);
        return;
      }

      // INITIAL_SESSION with no user, or other events
      if (event === "INITIAL_SESSION") {
        setProfileLoaded(true);
      }
    }
  );

  return () => { subscription.unsubscribe(); };
}, []);
```

