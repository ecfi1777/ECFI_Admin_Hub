

# Mobile Fixes -- Implementation Plan (Final)

## Overview

Four targeted fixes across 8 existing files. No new files, no new dependencies. Minimal changes that preserve all desktop behavior.

---

## Fix 1: Kanban Mobile -- Disable DnD, Add Status Select in ProjectDetailsSheet

### Problem
Touch drag-and-drop is unreliable on Android. Users cannot move cards between columns.

### Solution
On mobile (< 768px), do not render `DndContext` at all -- the board renders the same columns/cards but without any drag context wrapping. Users tap a card to open `ProjectDetailsSheet`, which will include a "Move to Phase" select dropdown to change status in 2 taps. On desktop, the existing `DndContext` behavior is fully preserved.

### Changes

**`src/pages/Kanban.tsx`**
- Import `useIsMobile` from `@/hooks/use-mobile`
- Get `const isMobile = useIsMobile()`
- Conditional rendering of the board area (lines 271-304):
  - If `isMobile`: render the `<div className="flex gap-4 ...">` with columns directly (no `DndContext`, no `DragOverlay`)
  - If not mobile: keep the existing `DndContext` wrapping with sensors, `handleDragStart`, `handleDragEnd`, and `DragOverlay`
- Pass `isMobile` prop to each `KanbanColumn`
- Change subtitle (line 226): mobile shows "Tap a project to change status", desktop keeps "Drag projects between columns to update status"

**`src/components/kanban/KanbanColumn.tsx`**
- Accept `isMobile?: boolean` prop in the interface
- Pass `isMobile` to each `ProjectCard`
- On `useDroppable`: pass `disabled: isMobile` (native dnd-kit option, confirmed in types) so droppable zones don't activate on mobile

**`src/components/kanban/ProjectCard.tsx`**
- Accept `isMobile?: boolean` prop in the interface (default false)
- Pass `disabled: isMobile` to `useDraggable()` (native dnd-kit option, confirmed in type definitions: `UseDraggableArguments.disabled?: boolean`)
- On mobile: swap `cursor-grab active:cursor-grabbing` for `cursor-pointer` in the Card className

**`src/components/projects/ProjectDetailsSheet.tsx`**
- Import `useProjectStatuses` from `@/hooks/useReferenceData`
- Import `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select`
- Import `useMutation, useQueryClient` from `@tanstack/react-query`
- Import `useOrganization` from `@/hooks/useOrganization`
- Add a status update mutation using the same pattern as Kanban's `handleDragEnd`:
  ```
  supabase.from("projects").update({ status_id }).eq("id", projectId)
  ```
- Below the existing status Badge (line 152-159), add a "Move to Phase" Select dropdown showing all statuses from `KANBAN_STATUSES`: No Status, Upcoming, Ready to Start, In Progress, Complete (excluding Archived)
- On selection: run mutation, invalidate `kanban-projects` and `projects` queries, show toast
- The existing Badge remains as-is (read-only display above the selector)
- "No Status" option sets `status_id` to `null`
- The Select uses `bg-slate-700 border-slate-600 text-slate-300` classes to match the sheet's dark theme

---

## Fix 2: Dialog Tabs -- Horizontal Scroll

### Problem
EditEntryDialog has 6 tabs and AddEntryDialog has 4 tabs in a `grid grid-cols-*` layout that overflows/overlaps at 360-375px.

### Changes

**`src/components/schedule/EditEntryDialog.tsx`** (line 88)
- Change: `<TabsList className="grid w-full grid-cols-6">`
- To: `<TabsList className="w-full overflow-x-auto flex flex-nowrap gap-1 pb-1">`

**`src/components/schedule/AddEntryDialog.tsx`** (line 185)
- Change: `<TabsList className="grid w-full grid-cols-4">`
- To: `<TabsList className="w-full overflow-x-auto flex flex-nowrap gap-1 pb-1">`

Each TabsTrigger already renders fine in a flex container -- no changes needed to individual triggers.

---

## Fix 3: Daily Schedule Header Stacking

### Problem
Title and date nav bar sit side-by-side (`flex items-center justify-between`), causing overflow at narrow widths.

### Changes

**`src/components/schedule/DailySchedule.tsx`** (lines 189-231)
- Outer padding (line 190): `p-6` changes to `p-3 md:p-6`
- Header wrapper (line 192): `flex items-center justify-between mb-6` changes to `flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6`
- Date nav group (line 197): `flex items-center gap-4` changes to `flex items-center gap-2 md:gap-4 w-full md:w-auto justify-between md:justify-end`

This stacks title on top, date navigation on a full-width row below on mobile, while desktop stays unchanged.

---

## Fix 4: Schedule Row Action Buttons -- stopPropagation

### Problem
On mobile, tapping Edit/Move/Delete buttons on schedule table rows does not fire because pointer events are captured by the parent row handler.

### Changes

**`src/components/schedule/ScheduleTable.tsx`** (lines 436-498)

Three buttons get the same treatment -- add `type="button"`, `onPointerDown` with `stopPropagation`, and wrap `onClick` with `stopPropagation`:

**Edit button** (line 436):
```
type="button"
onPointerDown={(e) => e.stopPropagation()}
onClick={(e) => {
  e.stopPropagation();
  setEditEntry(entry);
  setEditEntryTab("general");
}}
```

**Move button / PopoverTrigger** (line 450):
```
type="button"
onPointerDown={(e) => e.stopPropagation()}
onClick={(e) => e.stopPropagation()}
```

**Delete button** (line 490):
```
type="button"
onPointerDown={(e) => e.stopPropagation()}
onClick={(e) => {
  e.stopPropagation();
  setDeleteEntryId(entry.id);
}}
```

No business logic changes -- only event propagation control.

---

## Files Changed Summary

| # | File | Type of Change |
|---|------|---------------|
| 1 | `src/pages/Kanban.tsx` | Import useIsMobile, conditional DndContext rendering (not rendered on mobile), conditional subtitle, pass isMobile to columns |
| 2 | `src/components/kanban/KanbanColumn.tsx` | Accept + forward isMobile prop, `disabled: isMobile` on useDroppable |
| 3 | `src/components/kanban/ProjectCard.tsx` | Accept isMobile prop, `disabled: isMobile` on useDraggable, cursor class swap |
| 4 | `src/components/projects/ProjectDetailsSheet.tsx` | Add "Move to Phase" Select dropdown + inline status update mutation |
| 5 | `src/components/schedule/EditEntryDialog.tsx` | TabsList: `grid grid-cols-6` to `flex overflow-x-auto` |
| 6 | `src/components/schedule/AddEntryDialog.tsx` | TabsList: `grid grid-cols-4` to `flex overflow-x-auto` |
| 7 | `src/components/schedule/DailySchedule.tsx` | Header flex-col stacking, reduced mobile padding, date nav responsive width |
| 8 | `src/components/schedule/ScheduleTable.tsx` | stopPropagation on Edit/Move/Delete buttons |

**8 files total. No new files. No new dependencies. No duplicated business logic.**

### Completion Report
After implementation, a completion report will list every file changed, the key Tailwind class changes, and key logic changes, then STOP for manual testing.
