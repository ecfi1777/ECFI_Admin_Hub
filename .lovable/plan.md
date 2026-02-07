

## Add General Notes to Monthly Schedule Backup Export

The `notes` field (general entry notes) is missing from the Excel export. This is a small change across two files.

### Changes

**1. `src/pages/Reports.tsx`** - Add `notes` to the query select statement (line ~93, before `to_be_invoiced`).

**2. `src/lib/generateScheduleExcel.ts`** - Three updates:
   - Add `notes?: string | null` to the `ScheduleEntryExport` interface
   - Add a `"Notes"` column in the Excel data mapping, placed after "Crew Notes" (near the end, before Invoice Status)
   - Add a column width entry `{ wch: 30 }` for the new Notes column

### Technical Details

**Query change (Reports.tsx, line ~93):**
Add `notes,` to the select string, right before `to_be_invoiced`.

**Interface update (generateScheduleExcel.ts):**
Add `notes?: string | null;` to `ScheduleEntryExport`.

**Excel column (generateScheduleExcel.ts):**
Add `"Notes": entry.notes || "",` after `"Crew Notes"` and before `"Invoice Status"`.

**Column width:**
Add `{ wch: 30 }` for the Notes column after the Crew Notes width entry.

