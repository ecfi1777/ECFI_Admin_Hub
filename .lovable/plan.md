

## Fix: Pages Not Loading (Connection Pool Exhaustion)

### Problem
Two issues combine to exhaust the database connection pool after ~55 minutes:

1. **useTheme.tsx** has an `onAuthStateChange` listener that queries the `profiles` table on every token refresh (~55 min cycle), triggering expensive RLS joins on `organization_memberships`.

2. **useAuth.tsx** is a standalone hook (not a shared context), so every component calling it creates its own independent auth subscription. A typical page has 3-4 parallel subscriptions (ProtectedRoute, OrganizationProvider, AppLayout, ThemeProvider). When `TOKEN_REFRESHED` fires, all 4 react simultaneously, cascading DB queries.

Data-fetching pages (Projects, Schedule, Calendar, Kanban, Invoices, Discrepancies) hang on "Loading" because their queries cannot get connections from the pool.

### Solution -- 3 File Replacements

**File 1: `src/hooks/useTheme.tsx`** -- Replace entirely

- Reverts to a one-shot `getSession()` call on mount
- No more `onAuthStateChange` subscription -- eliminates recurring DB hits on token refresh
- Theme write (setTheme) and CSS class logic remain unchanged

**File 2: `src/hooks/useAuth.tsx`** -- Replace entirely

- Converts from a standalone hook to a Context Provider pattern
- Single `onAuthStateChange` subscription shared across the entire app
- Exports both `AuthProvider` (new) and `useAuth()` (same interface -- all existing call sites work unchanged)
- Uses `getSession()` for initial load, then `onAuthStateChange` for subsequent events (ignoring `INITIAL_SESSION` to avoid double-processing)

**File 3: `src/App.tsx`** -- Replace entirely

- Adds `AuthProvider` import from `useAuth`
- Wraps the provider tree: `AuthProvider` sits outside `ThemeProvider` and `OrganizationProvider`
- No other changes to routes or components

### What stays the same
- All existing `useAuth()` call sites throughout the app -- zero changes needed
- All routes, components, and page structure
- Theme toggle and persistence behavior
- Organization provider logic

### Verification after deploying
- Pages that were hanging (Projects, Schedule, Calendar, Kanban, Invoices, Discrepancies) should load immediately
- Theme preference still persists when toggled
- Auth flow (login, logout, token refresh) works normally
- No duplicate auth subscriptions in browser DevTools

