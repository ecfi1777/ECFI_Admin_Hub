

## Revert Aggressive Timeout Cleanup

### Problem
The 3-second timeout currently runs `signOut()`, `localStorage.clear()`, and `sessionStorage.clear()`, which logs out real users on slow connections.

### Change
**`src/hooks/useAuth.tsx`** -- Replace the `forceInitialized` function (lines 37-49) with a simple state update:

```typescript
const forceInitialized = () => {
  if (!mountedRef.current || initializationComplete.current) return;
  console.warn("Auth initialization timeout – unblocking UI");
  setState(prev => ({ ...prev, loading: false, initialized: true }));
  initializationComplete.current = true;
};
```

This removes:
- `supabase.auth.signOut({ scope: "local" })`
- `localStorage.clear()`
- `sessionStorage.clear()`
- The `async` keyword on the function
- The second `mountedRef.current` guard (no longer needed without async gap)

The timeout simply unblocks the UI. If a valid session arrives later via `onAuthStateChange`, it will update state normally. Expired/corrupted sessions are handled by the auth library itself.

No other files change.
