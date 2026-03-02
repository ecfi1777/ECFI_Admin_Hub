

## Chained Cancel and Reschedule

### Overview

This builds on the approved plan to add `is_cancelled`, `rescheduled_to_date`, and `rescheduled_from_entry_id` columns. The chaining behavior is primarily a logic concern -- the same database schema supports it with no additional columns needed.

### Database Migration

Same as the already-approved migration (no additional columns needed):

```sql
ALTER TABLE public.schedule_entries
  ADD COLUMN is_cancelled boolean NOT NULL DEFAULT false,
  ADD COLUMN rescheduled_to_date date,
  ADD COLUMN rescheduled_from_entry_id uuid REFERENCES public.schedule_entries(id);
```

### Cancel and Reschedule Flow (with chaining)

When the user cancels and reschedules an entry (whether it's an original or already a rescheduled copy):

1. Mark the current entry as `is_cancelled = true`, set `cancellation_reason` and `rescheduled_to_date`
2. If this entry was itself a rescheduled copy (has `rescheduled_from_entry_id`), that parent ghost is already permanent -- no changes needed there
3. Create a new duplicate entry on the target date with `rescheduled_from_entry_id` pointing to the entry that was just cancelled

**Example chain:**
- 3/2 original --> cancelled, `rescheduled_to_date = 3/3`
- 3/3 copy (points to 3/2) --> user cancels again --> `is_cancelled = true`, `rescheduled_to_date = 3/4`
- 3/4 copy (points to 3/3) --> this is the active entry

### Undo Logic (one step back)

When the user clicks "Undo" on the latest entry (3/4 in the example):

1. Look up `rescheduled_from_entry_id` to find the immediate parent (3/3)
2. Un-cancel the parent: set `is_cancelled = false`, clear `cancellation_reason` and `rescheduled_to_date`
3. Delete (soft-delete) the current entry (3/4)
4. The 3/2 ghost remains permanently cancelled

### Undo Button Visibility Rules

An entry shows the "Undo Reschedule" button only if ALL of these are true:
- It has `rescheduled_from_entry_id` (it's a rescheduled copy)
- It is NOT cancelled itself (`is_cancelled = false`)
- It is not `deleted`

This naturally means only the latest active entry in any chain has the button. Cancelled ghost entries never show it because `is_cancelled = true`.

### Ghost Entry Display (cancelled entries)

Cancelled entries (`is_cancelled = true`) render as a distinct row in ScheduleTable:
- Light red/pink background with red strikethrough text
- Shows: Crew, Builder, Location, Lot #, and "Cancelled -- moved to [rescheduled_to_date]" with the reason
- No action buttons (no edit, move, delete, or undo) -- they are permanent records
- The Cancel & Reschedule button is NOT shown on ghost entries

### Files to Modify

1. **Database migration** -- add `is_cancelled`, `rescheduled_to_date`, `rescheduled_from_entry_id`
2. **`src/types/schedule.ts`** -- add `is_cancelled`, `rescheduled_to_date`, `rescheduled_from_entry_id` fields
3. **`src/components/schedule/CancelRescheduleDialog.tsx`** -- change from "update date" to "mark cancelled + insert duplicate entry". The duplicate copies all relevant fields (crew, project, phase, supplier, etc.) from the source entry. Works the same whether the source is an original or a rescheduled copy.
4. **`src/components/schedule/ScheduleTable.tsx`** -- three changes:
   - Render cancelled ghost rows (similar to "did not work" but with cancelled styling and "moved to [date]" label)
   - Add "Undo Reschedule" button on entries that have `rescheduled_from_entry_id` and are not cancelled
   - Hide Cancel & Reschedule / Move / Delete buttons on ghost entries
5. **`src/components/calendar/CalendarEntry.tsx`** -- render cancelled entries with strikethrough and cancelled label
6. **`src/components/schedule/EditEntryDialog.tsx`** -- show cancelled/rescheduled status info banner if applicable
7. **`src/components/schedule/DailySchedule.tsx`** -- ensure the query fetches `is_cancelled`, `rescheduled_to_date`, `rescheduled_from_entry_id` fields (check current select statement)

### Edge Cases Handled

- **Chained cancellations**: Each cancel creates a new copy pointing to its immediate parent. All previous ghosts are permanent.
- **Undo only goes one step**: Deletes the latest copy and restores its immediate parent. Earlier ghosts remain.
- **No undo on ghosts**: Ghost entries have no action buttons, preventing confusion.
- **Cancelled entries in reports**: Ghost entries (`is_cancelled = true`) should not count in job totals, same as `did_not_work` entries.

