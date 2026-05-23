## Multiple Stone Suppliers per Schedule Entry

### Goal
Allow a single schedule entry to track stone deliveries from more than one supplier. Each supplier line has its own type, qty ordered, order #, invoice #, invoice amount, tons billed, and notes — so all costs are fully tracked. The Daily Schedule shows a "+" handle to add additional suppliers; once there are 2+, the cell label reads "Multiple".

### Where stone lives today (all touched)
- `schedule_entries` flat columns: `stone_supplier_id`, `stone_type_id`, `stone_invoice_number`, `stone_tons_billed`, `stone_invoice_amount`, `stone_notes` (Qty Ordered / Order # are shared `qty_ordered` / `order_number`)
- `src/types/schedule.ts` + `src/components/vendor-invoices/types.ts`
- `src/components/schedule/ScheduleTable.tsx` (Supplier cell — Prep Slabs branch)
- `src/components/schedule/EditEntryDialog.tsx` → `entry-form/tabs/StoneTab.tsx` (+ `useEntryForm.ts`, `types.ts`)
- `src/components/schedule/AddEntryDialog.tsx`
- `src/pages/VendorInvoices.tsx` + `VendorInvoiceRow.tsx` (stone branch)
- `src/components/projects/ProjectPLTab.tsx` (sums `stone_invoice_amount` per entry)
- `src/components/discrepancies/*` (uses tons billed)

### Database migration

New child table `schedule_entry_stone_lines`:

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| schedule_entry_id | uuid | FK-style, indexed, NOT NULL |
| organization_id | uuid | NOT NULL (for RLS) |
| supplier_id | uuid | nullable |
| stone_type_id | uuid | nullable |
| qty_ordered | text | nullable |
| order_number | text | nullable |
| invoice_number | text | nullable |
| invoice_amount | numeric | default 0 |
| tons_billed | numeric | default 0 |
| notes | text | nullable |
| display_order | int | default 0 |
| created_at / updated_at | timestamptz | |

- RLS mirroring `schedule_entries` (view/insert/update/delete scoped by `organization_id` via `organization_memberships`, with manage actions gated by `user_has_manage_access`).
- Audit trigger similar to `audit_schedule_entries` so changes show in the audit log (record_label = parent entry label + supplier code).
- Data migration: for every existing `schedule_entries` row where any `stone_*` field is non-null/non-zero, insert one row into `schedule_entry_stone_lines` carrying the existing values (including `qty_ordered` / `order_number` for Prep Slabs entries).
- The legacy flat `stone_*` columns on `schedule_entries` are **kept for now as backup** (read code stops using them).

### Schedule cell behavior (Prep Slabs row only)
- 0 lines → small ghost `+ Add Supplier` button
- 1 line → existing inline supplier dropdown (now backed by the single line, edits via the new table)
- 2+ lines → label reads **"Multiple"** with a `+` icon next to it; clicking the cell opens Edit Entry → Stone tab
- A small "+" icon is always shown beside the supplier label to quickly append another line (opens Stone tab, scrolled to a fresh blank line)

### Edit Entry → Stone tab redesign
- Replaces single-form layout with a **repeating Supplier Line** block. Each block has its own Supplier / Stone Type / Qty Ord / Order # / Invoice # / Invoice $ / Tons / Notes plus a trash icon.
- "+ Add Supplier" button at the bottom appends a new blank line.
- Saving the entry diffs the lines (insert new, update changed, delete removed) inside the same `Save Changes` action.
- Add Entry dialog gets the same multi-line capability when phase = Prep Slabs.

### Vendor Bills page
- Stone entries collapse into **one grouped row per schedule entry** labeled vendor `Multiple` when >1 line. Row expands to reveal one editable child row per supplier line (invoice #, $, tons, complete checkbox). Specific-vendor filter still matches if **any** line uses that supplier.
- "Need to invoice" detection treats the entry as incomplete while **any** line is missing invoice #/amount/tons.

### Project P&L
- Replace `e.stone_invoice_amount` aggregation with `sum(lines.invoice_amount)` for each entry within the matching phase section. No format/UI change beyond the source of the number.

### Discrepancies
- Tons-billed aggregation switches to `sum(lines.tons_billed)` per entry.

### Types & hooks
- New `StoneLine` type in `src/types/schedule.ts`; `ScheduleEntry.stone_lines: StoneLine[]`.
- All schedule fetch queries (`DailySchedule.tsx`, `CalendarView.tsx`, `Discrepancies.tsx`, `VendorInvoices.tsx`, `ProjectPLTab.tsx`, `ProjectScheduleHistory.tsx`, etc.) extended to include the new nested relation: `schedule_entry_stone_lines(*, suppliers:stone_suppliers(name,code), stone_types(name))`.

### Out of scope
- Concrete / Pump / Inspection stay single-vendor for now.
- Old `stone_*` columns are not dropped in this pass.

### Order of operations
1. Migration (table + RLS + audit trigger + data backfill) — submit, wait for approval.
2. After approval: update types/hooks, ScheduleTable cell, Stone tab, Add/Edit dialogs, VendorInvoices, ProjectPLTab, Discrepancies.
