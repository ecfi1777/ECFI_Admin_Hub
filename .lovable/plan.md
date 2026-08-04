# Extras to Invoice

A new page that works like Jobs to Invoice, but every row is typed in freeform. Nothing entered here creates a builder, location, project, or Drive folder — it is purely a charge-tracking list.

## What the user sees

New sidebar item **Extras to Invoice** (below Jobs to Invoice), route `/extras`.

Layout mirrors the Jobs to Invoice page:
- Search box + Builder filter (built from the values already used on extras) + Clear filters
- **Pending** / **Completed** tabs with counts
- Export to Excel on both tabs
- Completed tab paginated 50 / 100 / All

Each row has: Date, Builder/Customer, Location, Lot, Description, Amount, Invoice #, and an "Inv Complete" checkbox that moves the row between Pending and Completed.

## Adding and editing

- **Add Extra** button opens a small dialog with the seven fields. Only Builder/Customer and Description are required — Location, Lot, Amount and Invoice # can be left blank (so "KMW Properties — Escape Window Well" works fine).
- Builder/Customer and Location are free-text inputs with a suggestion dropdown drawn from existing builders/locations plus values previously typed on other extras. Choosing a suggestion just fills the text; it never links to or creates a record.
- Rows are editable inline (same pattern as the invoice number cell today) and can be deleted with a confirmation.

## Access

Owners and managers only — the page is hidden from viewers in the sidebar and blocked at the route, and the database rules restrict reading and writing to owner/manager, matching the other financial pages.

## Technical notes

- New table `public.invoice_extras`: `organization_id`, `entry_date` (date), `builder_name` (text, required), `location_name`, `lot_number`, `description` (text, required), `amount` (numeric, nullable), `invoice_number`, `invoice_complete` (boolean default false), `created_by`, `created_at`, `updated_at` + `update_updated_at_column` trigger.
- Grants to `authenticated` and `service_role`; RLS enabled with four policies scoped `TO authenticated` using `user_has_manage_access(auth.uid(), organization_id)`.
- New files: `src/pages/ExtrasToInvoice.tsx`, `src/components/extras/ExtraEntryDialog.tsx`, `src/components/extras/ExtrasTable.tsx`, plus an autocomplete input component. Route added in `App.tsx`, nav item in `AppLayout.tsx`.
- Excel export reuses the existing ExcelJS helper pattern from the invoices export.
- Client-side zod validation with length caps on the text fields; amount parsed as a number.
