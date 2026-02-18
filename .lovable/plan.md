

## Convert `useAuth` to a Shared AuthProvider Context

### Problem
`useAuth()` is a standalone hook — every component that calls it creates its own independent auth state, each racing `onAuthStateChange`. During navigation, components unmount/remount, creating new instances that start with `loading: true` and `user: null`, causing the sidebar email to flash away.

### Solution
Refactor `src/hooks/useAuth.tsx` to use the React Context pattern (exactly like `useOrganization`):

1. Create an `AuthContext` with `createContext`
2. Create an `AuthProvider` component that holds the single auth state + subscription
3. Export a `useAuth()` hook that reads from context
4. Wrap the app in `AuthProvider` in `src/App.tsx`

### File Changes

**`src/hooks/useAuth.tsx`** — Full refactor:
- Add `createContext`, `useContext`, `ReactNode` imports
- Define `AuthContextValue` interface (user, session, loading, initialized, signOut)
- Create `AuthContext = createContext<AuthContextValue | null>(null)`
- Create `AuthProvider` component containing all the existing state, refs, useEffect, and signOut logic (unchanged internally)
- The provider renders `<AuthContext.Provider value={...}>{children}</AuthContext.Provider>`
- Replace the exported `useAuth()` function body: instead of managing state, it calls `useContext(AuthContext)` and throws if used outside the provider
- Export both `AuthProvider` and `useAuth`

**`src/App.tsx`** — Wrap with AuthProvider:
- Import `AuthProvider` from `@/hooks/useAuth`
- Add `<AuthProvider>` wrapping around `<ThemeProvider>` (or just inside `<QueryClientProvider>`, before `<ThemeProvider>`) so auth is available to ThemeProvider and OrganizationProvider
- No other changes to App.tsx

### What does NOT change
- ThemeProvider — untouched
- No new loading gates or CSS changes
- The internal auth logic (getSession, onAuthStateChange, signOut) stays identical
- All 9 consumer files (`AppLayout`, `ProtectedRoute`, `OrganizationProvider`, `Onboarding`, settings components, etc.) continue calling `useAuth()` with the same return shape — zero changes needed
- OrganizationProvider continues consuming `useAuth()` the same way

### Technical Detail

```typescript
// New structure of useAuth.tsx (simplified)

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // All existing state, refs, useEffect, signOut — moved here unchanged
  const [state, setState] = useState<AuthState>({...});
  // ... existing useEffect with onAuthStateChange ...
  const signOut = useCallback(...);

  const value = useMemo(() => ({
    user: state.user, session: state.session,
    loading: state.loading, initialized: state.initialized, signOut,
  }), [state.user, state.session, state.loading, state.initialized, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

```typescript
// App.tsx change — add AuthProvider wrapper
const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>        {/* NEW */}
        <ThemeProvider>
          <OrganizationProvider>
            ...
          </OrganizationProvider>
        </ThemeProvider>
      </AuthProvider>         {/* NEW */}
    </QueryClientProvider>
  </ErrorBoundary>
);
```

### Why this fixes the bug
With context, auth state is initialized exactly once at the root. All consumers — sidebar, route guards, organization provider — read from the same single instance. Page navigation no longer triggers new subscriptions or races.
