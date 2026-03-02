

## Bug Fix: Add Missing Fields to Calendar Data Hook

### Problem
The `useCalendarEntries` hook in `src/hooks/useCalendarData.ts` does not fetch the fields needed for cancelled/did-not-work rendering. The `.select()` clause is missing 7 fields that `CalendarEntry.tsx` already knows how to render.

### Fix
**File:** `src/hooks/useCalendarData.ts` (lines 28-42)

Add the missing fields to the `.select()` string:

```
id,
scheduled_date,
crew_id,
phase_id,
project_id,
start_time,
did_not_work,
not_working_reason,
is_cancelled,
cancellation_reason,
rescheduled_from_date,
rescheduled_to_date,
rescheduled_from_entry_id,
crews(name),
phases(name),
projects(
  lot_number,
  builders(name, code),
  locations(name)
)
```

Single-file, single-location edit. No database or other component changes needed.

