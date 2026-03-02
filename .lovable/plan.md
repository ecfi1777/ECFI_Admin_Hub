
## Filter Active Projects in Add Schedule Entry Modal

### Problem
The `useProjects()` hook in `src/hooks/useReferenceData.ts` fetches all projects without filtering out archived or deleted ones. Both the Add and Edit entry dialogs use this same hook.

### Solution
Create a separate `useActiveProjects()` hook (or add a parameter) that filters out archived and deleted projects, and use it only in the Add Entry dialog. The Edit Entry dialog will continue using the unfiltered `useProjects()` hook.

### Changes

**1. `src/hooks/useReferenceData.ts`** — Add a new `useActiveProjects()` hook that adds two filters to the query:
- `.eq("is_archived", false)` — excludes archived projects
- `.is("deleted_at", null)` — excludes soft-deleted projects

This keeps the existing `useProjects()` unchanged for the Edit dialog.

**2. `src/components/schedule/AddEntryDialog.tsx`** — Change the import from `useProjects` to `useActiveProjects` so the Add modal only shows active, non-deleted projects.

### Technical Details

The projects table uses two separate mechanisms for hiding projects:
- `is_archived` (boolean, default false) — for archiving
- `deleted_at` (timestamp, nullable) — for soft-delete

Note: RLS already hides soft-deleted projects from non-owners, but the `is_archived` filter is not enforced at the RLS level, so it must be applied in the query. Adding both filters at the query level ensures no unnecessary data is fetched regardless of the user's role.
