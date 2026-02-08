

# Fix: Make ProjectDetailsSheet Handle Editing Internally

## Problem
The pencil button in ProjectDetailsSheet calls `onEdit()`, but 3 of 5 parent components pass empty handlers (`() => {}`), so Edit does nothing from Daily Schedule, Discrepancies, and Invoices pages.

## Solution
Move EditProjectDialog ownership into ProjectDetailsSheet so it always works regardless of parent wiring.

## Detailed Changes

### 1. `src/components/projects/ProjectDetailsSheet.tsx`

**Props change:** Remove `onEdit` from `ProjectDetailsSheetProps` interface (4 props become 3).

**New imports:**
- `useState` from `react`
- `EditProjectDialog` from `./EditProjectDialog`
- `useBuilders`, `useLocations` from `@/hooks/useReferenceData` (already imports `useProjectStatuses`)

**New state:**
```
const [isEditOpen, setIsEditOpen] = useState(false)
```

**Hooks rule:** The three reference-data hooks (`useBuilders`, `useLocations`, `useProjectStatuses`) plus the existing `useQuery` hooks will all be called **before** the early return on line 150 (`if (!projectId) return null`). This avoids the React hooks-called-conditionally error.

**Pencil button (line 167):**
- Change `onClick={onEdit}` to `onClick={() => setIsEditOpen(true)}`

**Render EditProjectDialog** as a sibling after the `</Sheet>` closing tag (not inside SheetContent), using the **exact same prop pattern** currently used in Kanban.tsx and Projects.tsx:

```tsx
<EditProjectDialog
  project={project}
  isOpen={isEditOpen}
  onClose={() => {
    setIsEditOpen(false);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["kanban-projects"] });
  }}
  builders={builders}
  locations={locations}
  statuses={statuses}
/>
```

The `project` variable from the existing query (line 77) already contains `id`, `lot_number`, `builder_id`, `location_id`, `status_id`, `notes`, `full_address`, `county`, `permit_number`, `authorization_numbers`, `wall_height`, `basement_type`, `google_drive_url` -- exactly what `EditProjectDialog`'s `Project` interface expects on lines 30-44.

The dialog opens **over** the sheet (both use Radix portals with z-50, so layering works naturally). No need to close the sheet first.

### 2. Remove `onEdit` prop from all 5 parent usages

| File | Current code | Change |
|------|-------------|--------|
| `src/pages/Kanban.tsx` line 332 | `onEdit={handleEditFromDetails}` | Remove this prop |
| `src/pages/Projects.tsx` line 370 | `onEdit={handleEditFromDetails}` | Remove this prop |
| `src/components/schedule/ScheduleTable.tsx` lines 560-562 | `onEdit={() => { ... }}` | Remove this prop |
| `src/pages/Discrepancies.tsx` line 280 | `onEdit={() => {}}` | Remove this prop |
| `src/pages/Invoices.tsx` line 448 | `onEdit={() => {}}` | Remove this prop |

### 3. Cleanup redundant edit wiring in Kanban.tsx

Remove (since the sheet now owns editing and this was the only edit path):
- `isEditOpen` state (line 54)
- `handleEditFromDetails` function (lines 202-205)
- `fullSelectedProject` query (lines 208-221) -- note: this query shares queryKey `["project", selectedProjectId]` with the sheet's own query, so the sheet already fetches the same data
- Standalone `<EditProjectDialog>` render (lines 335-345)
- `EditProjectDialog` import (line 31)

### 4. Cleanup redundant edit wiring in Projects.tsx

Remove:
- `isEditOpen` state (line 70)
- `handleEditFromDetails` function (lines 179-182)
- `selectedProject` derived variable (line 151) -- only used by the standalone EditProjectDialog
- Standalone `<EditProjectDialog>` render (lines 374-381)
- `EditProjectDialog` import (line 34)

## Files changed (6 total)

| File | What changes |
|------|-------------|
| `src/components/projects/ProjectDetailsSheet.tsx` | Add EditProjectDialog + local state + hooks; remove `onEdit` prop |
| `src/pages/Kanban.tsx` | Remove `onEdit` prop, `handleEditFromDetails`, `isEditOpen`, `fullSelectedProject` query, standalone EditProjectDialog + import |
| `src/pages/Projects.tsx` | Remove `onEdit` prop, `handleEditFromDetails`, `isEditOpen`, `selectedProject`, standalone EditProjectDialog + import |
| `src/components/schedule/ScheduleTable.tsx` | Remove `onEdit` prop |
| `src/pages/Discrepancies.tsx` | Remove `onEdit` prop |
| `src/pages/Invoices.tsx` | Remove `onEdit` prop |

## What does NOT change
- `EditProjectDialog` component itself (no modifications)
- The pencil Button element structure (no touch hacks)
- Desktop behavior
- Move-to-Phase dropdown in the sheet
- PDF export button in the sheet
- Move/Delete buttons in ScheduleTable

## Verification
After implementation, the following must be manually tested on Android Chrome:
1. Daily Schedule -- open ProjectDetailsSheet -- tap pencil -- EditProjectDialog opens
2. Invoices -- open sheet -- tap pencil -- dialog opens
3. Discrepancies -- open sheet -- tap pencil -- dialog opens
4. Kanban -- pencil still opens dialog
5. Projects -- pencil still opens dialog
6. Desktop behavior unchanged on all pages
