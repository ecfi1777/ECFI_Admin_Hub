
## Add Cancel/Reschedule History to Project Schedule History

### What Changes

The `ProjectScheduleHistory.tsx` component will be updated to fetch and display cancel/reschedule fields, with the same visual treatment used in the daily schedule.

### Changes to `ProjectScheduleHistory.tsx`

**1. Update the local `ScheduleEntry` interface** (lines 36-68)

Add these fields:
- `is_cancelled: boolean`
- `cancellation_reason: string | null`
- `rescheduled_to_date: string | null`
- `rescheduled_from_date: string | null`
- `rescheduled_from_entry_id: string | null`

**2. Update the query select** (lines 107-138)

Add the five new fields to the `.select()` call:
- `is_cancelled`
- `cancellation_reason`
- `rescheduled_to_date`
- `rescheduled_from_date`
- `rescheduled_from_entry_id`

**3. Render cancelled ghost entries with red strikethrough** (around line 357-395)

For entries where `is_cancelled === true`:
- Wrap the entry card with a light red/pink background (`bg-red-900/20 border border-red-800/30`) instead of the normal `bg-slate-800`
- Apply `line-through decoration-red-500` to the date, crew name, and other text
- Hide the Edit button entirely (read-only ghost)
- Show a label below the date line: "Cancelled -- moved to [rescheduled_to_date]" in red text
- Show the `cancellation_reason` in italic text if present

For entries where `rescheduled_from_date` is set (and not cancelled):
- Show a small info label: "Rescheduled from [rescheduled_from_date]" in amber/yellow text below the date

**4. Hide Edit button on cancelled entries**

The existing condition `{!readOnly && (...)}` around the Edit button will get an additional check: `&& !entry.is_cancelled`

### No Other Files Changed

This is a single-file change to `ProjectScheduleHistory.tsx`. No database migration needed since the columns already exist.
