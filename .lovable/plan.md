

# Fix: Organization Switcher Data Refresh

## Problem Analysis

When switching organizations, the data on the current page doesn't refresh immediately. The console logs show "Organization switched... invalidating queries" is being called, but network requests show queries are still fetching with the OLD organization ID.

### Root Cause

There's a **timing/state propagation issue** in the React lifecycle:

1. User clicks to switch organization in `OrganizationSwitcher`
2. `switchOrganization(newOrgId)` is called, which sets `activeOrgId` state
3. The `useEffect` in `useOrganization` detects `currentMembership?.organization_id` changed and calls `queryClient.invalidateQueries()`
4. **Problem**: At this point, the child components (like `DailySchedule`) haven't re-rendered yet with the new `organizationId`
5. When TanStack Query refetches the invalidated queries, the query functions still have the OLD `organizationId` in their closure from the previous render
6. Result: Data is fetched for the wrong organization

### Evidence from Network Logs

All requests after switching still show:
```
organization_id=eq.9e6edef7-b918-401c-9d96-8952cc66ec6b
```
Even though the organization visually switched in the sidebar.

## Solution

Instead of calling `invalidateQueries()` immediately in a `useEffect`, we need to ensure queries refetch **after** the new `organizationId` has propagated to all components. There are two approaches:

### Approach: Force Component Re-render First, Then Invalidate

The cleanest fix is to:

1. **Remove** the query invalidation from `useOrganization` hook's `useEffect`
2. **Add a "key" prop** to the main content area that changes when `organizationId` changes

This forces React to unmount and remount the entire content tree with fresh state and the correct `organizationId`.

## Implementation

### Step 1: Remove Query Invalidation from useOrganization

Remove the `useEffect` that calls `queryClient.invalidateQueries()` since it's causing the race condition.

**File: `src/hooks/useOrganization.tsx`**

```typescript
// REMOVE this entire useEffect block (lines 86-106):
// Track previous org to detect changes and invalidate queries
const previousOrgIdRef = useRef<string | null>(null);
const isInitializedRef = useRef(false);

// Invalidate queries when organizationId changes (after initial load)
useEffect(() => {
  const currentOrgId = currentMembership?.organization_id ?? null;
  
  if (isInitializedRef.current && previousOrgIdRef.current !== currentOrgId && currentOrgId) {
    console.log("Organization switched from", previousOrgIdRef.current, "to", currentOrgId, "- invalidating queries");
    queryClient.invalidateQueries();
  }
  
  if (currentOrgId && !isInitializedRef.current) {
    isInitializedRef.current = true;
  }
  
  previousOrgIdRef.current = currentOrgId;
}, [currentMembership?.organization_id, queryClient]);
```

Also remove the now-unused imports and `useQueryClient` call if no longer needed.

### Step 2: Add Key Prop to Force Re-mount in AppLayout

Use React's `key` prop to force a complete re-render of the main content area when `organizationId` changes. This guarantees all child components unmount and remount with the new context.

**File: `src/components/layout/AppLayout.tsx`**

Wrap the main content area with a `key={organizationId}`:

```tsx
export function AppLayout({ children }: AppLayoutProps) {
  const { organizationId } = useOrganization();
  
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main key={organizationId || "loading"} className="flex-1">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
```

When `organizationId` changes:
- React sees a different `key` on `<main>`
- It unmounts the old tree and mounts a fresh one
- All `useQuery` hooks re-run with the correct `organizationId`
- No stale closures, no race conditions

## Why This Works

1. **No timing issues**: React's key-based remounting is synchronous and deterministic
2. **Clean state**: Each organization gets a fresh component tree with no stale data
3. **Simpler code**: Removes complex effect-based invalidation logic
4. **Guaranteed correctness**: Queries always run with the correct `organizationId` from their initial mount

## Technical Details

The key change is conceptually simple but has significant impact:

```text
Before (race condition):
┌──────────────────────────────────────────────────────┐
│ 1. switchOrganization(newId)                         │
│ 2. activeOrgId state updates                         │
│ 3. useEffect detects change                          │
│ 4. invalidateQueries() called                        │
│ 5. TanStack refetches with OLD organizationId ❌     │
│ 6. Components re-render with new organizationId      │
│ 7. User sees stale data                              │
└──────────────────────────────────────────────────────┘

After (key-based remount):
┌──────────────────────────────────────────────────────┐
│ 1. switchOrganization(newId)                         │
│ 2. activeOrgId state updates                         │
│ 3. AppLayout re-renders with new organizationId      │
│ 4. key={organizationId} changes                      │
│ 5. React unmounts old <main>, mounts new <main>      │
│ 6. All children mount fresh with correct context     │
│ 7. useQuery hooks run with correct organizationId ✓  │
└──────────────────────────────────────────────────────┘
```

## Files to Modify

1. **`src/hooks/useOrganization.tsx`** - Remove the query invalidation effect and related refs
2. **`src/components/layout/AppLayout.tsx`** - Add `key={organizationId}` to main content wrapper

