# Multi-supplier Stone tab — finish the UI + save wiring

## Problem
The DB table `schedule_entry_stone_lines` and the form-state field `stone_lines` already exist, but `StoneTab.tsx` is still the original single-supplier form. So you can only enter one supplier even though the backend can hold many.

## Fix

### 1. Rewrite `src/components/schedule/entry-form/tabs/StoneTab.tsx`
Render `formData.stone_lines` as a vertical stack of **supplier line blocks**. Each block contains the existing fields (Supplier, Stone Type, Qty Ordered, Order #, Invoice #, Invoice Amount, Tons Billed, Notes) plus a trash icon to remove it.

- Above the stack: small header "Stone Suppliers".
- Below the stack: a full-width ghost button **`+ Add Supplier`** that appends a new blank line.
- If `stone_lines` is empty on open, auto-seed one blank line so the form is never empty.
- Each line uses the same `InlineAddSelect` for supplier so a brand-new supplier can still be added inline.
- Drop the legacy single-supplier fields from the tab entirely — they're replaced by line 1.

### 2. `useEntryForm.ts`
- On `loadFromEntry`: if `entry.stone_lines` is empty but the legacy `stone_supplier_id` is set, synthesize a single line from the legacy columns so old entries open cleanly. (Migration already backfilled the table, this is just a safety net.)
- Add helpers `addStoneLine()`, `updateStoneLine(index, patch)`, `removeStoneLine(index)` returned alongside `updateField`.
- `getInsertPayload` / `getUpdatePayload` no longer write the legacy `stone_*` columns from form fields; instead they mirror **line 1's values** into the legacy `stone_supplier_id / stone_type_id / stone_invoice_number / stone_invoice_amount / stone_tons_billed / stone_notes` columns. That keeps the Schedule table cell, P&L, Discrepancies, and Vendor Bills (which still read those columns today) working until they're migrated to read from `stone_lines`.

### 3. Save diff in `AddEntryDialog.tsx` and `EditEntryDialog.tsx`
After the `schedule_entries` insert/update succeeds, run a stone-lines sync against `schedule_entry_stone_lines`:
- **Add dialog**: insert every non-empty line with the new entry's `id` and `organization_id`.
- **Edit dialog**: compare current form lines against the originals loaded from the entry:
  - lines with an `id` not in the new set → delete
  - lines with an `id` and changed values → update
  - lines without an `id` → insert
- Wrap in `Promise.all`; on any failure, toast and let the user retry.

### 4. Schedule cell (`ScheduleTable.tsx`) — minor follow-through
For Prep Slabs rows: if the entry has `stone_lines.length > 1`, show **"Multiple"** with a `+` icon that opens Edit → Stone tab. If `≤ 1`, keep the current inline supplier dropdown driven by line 1 (still mirrored into the legacy column). This matches what you previously approved.

## Out of scope this pass
- Vendor Bills grouped "Multiple" row and P&L summing across lines — both still work via the mirrored line-1 legacy columns. We'll switch them to iterate over `stone_lines` next, once you've confirmed the new tab UI feels right.
