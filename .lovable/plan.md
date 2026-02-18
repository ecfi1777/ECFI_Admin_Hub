

## Problem

When the Edit Entry dialog is opened from the **Calendar View**, vendor-related fields (Concrete, Pump, Inspection, Crew, Invoicing tabs) appear empty. This is because the Calendar query only fetches a minimal set of columns (id, date, crew, phase, project) for performance -- it doesn't include supplier_id, concrete_mix_id, pump fields, inspection fields, etc.

The `EditEntryDialog` currently relies entirely on the `entry` prop passed to it, so when the Calendar passes its partial data, `loadFromEntry` sets all missing fields to empty strings.

## Solution

Modify `EditEntryDialog` to **fetch the complete schedule entry record by ID** from the database whenever the dialog opens, rather than relying on the (potentially partial) entry prop. This ensures all tabs are fully populated regardless of which view opens the dialog.

## Technical Details

**File: `src/components/schedule/EditEntryDialog.tsx`**

1. Add a `useQuery` call that fetches the full `schedule_entries` record by `entry.id` when `open` is true, selecting all columns plus nested relations (crews, phases, suppliers, pump_vendors, inspection_types, inspectors, concrete_mixes, projects with builders/locations).
2. Set `staleTime: 0` and use `open` as a query key dependency so it always re-fetches fresh data when the dialog opens.
3. Change `loadFromEntry` to use the fetched full record instead of the prop.
4. Keep the `entry` prop for the dialog title / project label (it has enough data for that), but populate the form from the fresh query result.
5. Show a brief loading state while the full record is being fetched.

This approach:
- Requires **no changes** to the Calendar query (it stays lightweight for performance).
- Works correctly from **every view** (Calendar, Schedule, Project Details, Day Detail Modal) since it always fetches the complete record.
- Aligns with the existing architectural pattern documented in the project's memory (`staleTime: 0` + `open` dependency for fresh data).

