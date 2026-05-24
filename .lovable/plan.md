## Add Notes to Vendor Bills rows

Add the ability to add/edit a note for each row directly from the Vendor Bills view. Each row maps to a vendor type (concrete / stone / pump / inspection), and each type already has its own notes column on `schedule_entries` (`concrete_notes`, `stone_notes`, `pump_notes`, `inspection_notes`). The note saved from a row writes to the column that matches the row's type.

### UX

- New small **note icon button** in each row, placed just before the Save (disk) button in the action area.
- Icon reflects state:
  - Empty note → outlined `StickyNote` icon, muted color.
  - Has note → filled/primary-colored icon so users can see at a glance which rows have notes.
- Clicking the icon opens a **Popover** anchored to the button with:
  - Title showing the vendor type (e.g. "Concrete Notes", "Stone Notes").
  - `<Textarea>` (3–4 rows) prefilled with the existing note.
  - Cancel and Save buttons.
- Save persists to the type-specific column and shows a toast; popover closes.
- On mobile card layout, the same icon button appears in the action row.

### Data

- No DB migration. Reuse existing columns:
  - concrete → `concrete_notes`
  - stone → `stone_notes`
  - pump → `pump_notes`
  - inspection → `inspection_notes`
- Add these fields to the `VendorEntry` interface in `src/components/vendor-invoices/types.ts` and to the select in the parent query that builds vendor rows (so the initial note value loads).

### Files to change

1. **`src/components/vendor-invoices/types.ts`** — Add `concrete_notes`, `stone_notes`, `pump_notes`, `inspection_notes` to `VendorEntry`.
2. **`src/pages/VendorInvoices.tsx`** (parent that fetches `vendor-invoice-entries`) — Add the four notes columns to the supabase select.
3. **`src/components/vendor-invoices/VendorInvoiceRow.tsx`**:
   - Add `NOTES_FIELD` map: `{ concrete: "concrete_notes", stone: "stone_notes", pump: "pump_notes", inspection: "inspection_notes" }`.
   - Local state `noteValue` initialized from the matching column, plus `noteOpen`.
   - `saveNoteMutation` that updates the single notes column on `schedule_entries` and invalidates `["vendor-invoice-entries"]`.
   - Render a `Popover` with `StickyNote` trigger button in both desktop row (next to Save) and mobile card actions.
   - Filled icon style when current saved note is non-empty.
4. **`src/components/vendor-invoices/VendorInvoiceTable.tsx`** — No header column needed (icon fits in the existing Save action cell). If the icon needs its own column for alignment, add a "Notes" header before "Save".

### Out of scope

- No changes to the underlying schedule entry edit dialog.
- No bulk-notes editing.
- No new filters based on notes.
- No DB schema changes.
