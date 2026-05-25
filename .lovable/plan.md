## Sub Contractor / 1099 Crews → Sub Labor Vendor Bills

Add a "Sub Contractor / 1099" flag on crews. When a sub crew is scheduled, allow flagging the entry as billable. Billable sub entries appear on the Vendor Bills page as a new "Sub Labor" row type, cleared by entering invoice # and amount (same UX as Pump).

### 1. Database

- `crews`: add `is_subcontractor boolean NOT NULL DEFAULT false`.
- `schedule_entries`: add three new columns
  - `sub_will_invoice boolean NOT NULL DEFAULT false`
  - `sub_invoice_number text`
  - `sub_invoice_amount numeric DEFAULT 0`

### 2. Settings → Crews

In `CrewsManagement` / `CrewOrderTable`, add a "Sub / 1099" toggle column next to the existing Active toggle. Toggles `crews.is_subcontractor`. Defaults off for existing crews.

### 3. Schedule Entry Form

In `useEntryForm` + entry-form types, add `sub_will_invoice` to the form state.

In `GeneralTab` (or a small new conditional block under the crew select): when the currently selected crew has `is_subcontractor = true`, show a checkbox "Sub will invoice for this work". Hidden otherwise. Persists to `schedule_entries.sub_will_invoice`.

No changes to phase logic, cancel/reschedule, P&L, or commissions.

### 4. Vendor Bills page

In `src/pages/VendorInvoices.tsx`:
- Extend the entry query to select `sub_will_invoice`, `sub_invoice_number`, `sub_invoice_amount`, and `crews.is_subcontractor`, `crews.name`.
- When building rows, emit a `type: 'sub'` row for any entry where `sub_will_invoice = true`, with `vendorName = crews.name`.

In `src/components/vendor-invoices/types.ts`:
- Extend `VendorTypeFilter` to include `'sub'`.
- Extend `VendorInvoiceRowData.type` union with `'sub'`.
- Add `sub_will_invoice`, `sub_invoice_number`, `sub_invoice_amount` to `VendorEntry`, and `crews.is_subcontractor` to the crews relation.

In `VendorInvoiceFilters.tsx`:
- Add "Sub Labor" option to the Type dropdown.
- Vendor dropdown for Sub Labor lists subcontractor crew names.

In `VendorInvoiceRow.tsx` (desktop + mobile):
- For `type === 'sub'`:
  - Type badge: "Sub Labor".
  - Vendor: crew name.
  - Invoice # input → `sub_invoice_number`.
  - Yards Billed: render `—` (same as Pump/Inspection).
  - Amount input → `sub_invoice_amount` with permanent `$` prefix (matches existing vendor-bills convention).
  - Save handler writes both fields back to `schedule_entries`.
- Keep cancelled-entry exclusion (`is_cancelled = false`) already in place.

### 5. Out of scope

- No P&L, Labor Tracking, or Commission changes. Sub Labor lives only in Vendor Bills for now (we can wire it into financials in a follow-up).
- No changes to the cancel/reschedule flow, calendar, discrepancies, or reports.
- No badge/color additions beyond the new "Sub Labor" type label.

### Technical notes

- New `crews.is_subcontractor` column — Settings toggle uses the existing org-scoped RLS update policy, no new policies needed.
- New schedule_entries columns inherit existing RLS. The audit trigger on `schedule_entries` will automatically capture changes via `to_jsonb(NEW)` — no trigger edits required.
- `VendorEntry` type lives in `src/components/vendor-invoices/types.ts`; row-builder logic lives in `VendorInvoices.tsx`. Both need parallel updates.
