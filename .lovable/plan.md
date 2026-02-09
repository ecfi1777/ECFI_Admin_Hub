

## Migrate Archiving from Status-Based to Boolean Flag

This plan replaces the "Archived" project status with a simple `is_archived` boolean flag on the projects table, making archiving independent of the status workflow.

---

### Step 1: Database Migration

A single migration that performs the following operations in order:

1. **Add column**: `is_archived BOOLEAN NOT NULL DEFAULT false` to `projects`
2. **Migrate data**: For projects currently assigned to an "Archived" status, set `is_archived = true` and reassign their status to "Complete" (or the highest `display_order` status if "Complete" doesn't exist for that org)
3. **Delete "Archived" status rows** from `project_statuses`
4. **Drop function**: `auto_archive_completed_projects()`
5. **Unschedule cron job**: `cron.unschedule('auto-archive-completed-projects')` wrapped in `BEGIN/EXCEPTION` block so it won't fail if the job doesn't exist
6. **Update `seed_organization_defaults()`**: Remove "Archived" from seeded statuses (keep Upcoming, Ready to Start, In Progress, Complete with display_order 1-4)
7. **Create index**: `idx_projects_is_archived` on `(organization_id, is_archived)`

---

### Step 2: Kanban Board

**File: `src/pages/Kanban.tsx`**

- Replace the client-side `.filter((p) => p.project_statuses?.name !== "Archived")` (line 82) with `.eq("is_archived", false)` in the Supabase query
- Add an `onArchive` callback prop passed to `ProjectCard` -- on click, updates `is_archived = true`, invalidates queries, shows toast: "Project archived. You can restore it from the Projects page."

**File: `src/components/kanban/ProjectCard.tsx`**

- Add optional `onArchive` prop
- Add a small archive icon button (using `Archive` from lucide-react) that calls `onArchive` on click, with `e.stopPropagation()` to prevent opening the details sheet
- Only show the archive button when `onArchive` is provided (allows hiding it for the drag overlay)

No changes to columns, drag-and-drop, collapse, search, or filters.

---

### Step 3: Projects Page

**File: `src/pages/Projects.tsx`**

- Change the "Include Archived" filter (line 151) from `project.project_statuses?.name === "Archived"` to checking `project.is_archived`
  - Toggle OFF (default): only show projects where `is_archived === false`
  - Toggle ON: show all projects
- Add an archive/unarchive action per row:
  - Non-archived projects: small "Archive" icon button
  - Archived projects (when toggle is ON): small "Unarchive" icon button
  - Each button updates `is_archived` via Supabase, invalidates queries, shows a toast
- Add a visual indicator (e.g., "Archived" badge) next to the status badge for archived projects
- Remove any filtering logic that hides "Archived" from the status dropdown (it won't exist after migration)

---

### Step 4: Project Details Panel

**File: `src/components/projects/ProjectDetailsSheet.tsx`**

- Add an "Archive" / "Unarchive" button in the header next to the edit and PDF export buttons
- Show an "Archived" badge when `project.is_archived === true`
- The `KANBAN_STATUSES` constant (line 36) already only lists the 4 active statuses plus "No Status" -- no change needed since "Archived" was never in it
- Invalidate all relevant queries on archive/unarchive

---

### Step 5: Status Colors

**File: `src/lib/statusColors.ts`**

- Remove the `"Archived"` case (lines 14-15) from `getStatusColor()` since it's no longer a status

---

### Step 6: Project Form

**File: `src/components/projects/ProjectFormFields.tsx`**

- No changes needed. Since "Archived" will be deleted from `project_statuses`, the dropdown will naturally show only the remaining 4 statuses.

---

### Technical Summary

| File | Change |
|------|--------|
| Database migration | Add column, migrate data, drop function, unschedule cron, update seed, add index |
| `src/pages/Kanban.tsx` | Add `.eq("is_archived", false)` to query; remove client-side filter; pass `onArchive` to cards |
| `src/components/kanban/ProjectCard.tsx` | Add archive icon button with `onArchive` prop |
| `src/pages/Projects.tsx` | Update archived filter to use `is_archived`; add archive/unarchive row actions + badge |
| `src/components/projects/ProjectDetailsSheet.tsx` | Add archive/unarchive button + archived badge |
| `src/lib/statusColors.ts` | Remove "Archived" case |

