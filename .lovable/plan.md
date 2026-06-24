## Add Commission Report Notes (per crew, per month)

### New table: `commission_report_notes`
Columns:
- `organization_id` (uuid, FK organizations)
- `crew_id` (uuid, FK crews)
- `month` (int, 1-12)
- `year` (int)
- `notes` (text)
- standard id / created_at / updated_at
- Unique constraint on (organization_id, crew_id, month, year)

RLS: members of the org can SELECT; managers/owners (`user_has_manage_access`) can INSERT/UPDATE/DELETE. GRANTs for authenticated + service_role. `updated_at` trigger.

### UI changes — `src/components/reports/CommissionReport.tsx`
- Fetch notes for the visible (org, month, year) keyed by `crew_id`.
- Below each crew's "Total - Crew X" / percentages rows (still inside the bordered card), render a Notes block:
  - Small "Notes" label
  - `<Textarea>` bound to local state, seeded from fetched value
  - Auto-save on blur via an upsert mutation (on conflict update notes), with a `sonner` success toast and React Query invalidation
  - Read-only textarea for viewers (no manage access) — gated with `useUserRole`
- Local optimistic state per crew so typing isn't laggy.

### Excel export
In `handleExport`, after each crew's totals row, if the crew has notes, add:
- A bold "Notes:" cell
- A row with the notes text, merged across all columns, wrap enabled, top-aligned
- Then the existing blank spacer

### Out of scope
- No new permissions model — reuses existing manager+ checks.
- No history/versioning of notes.
