# Show the stone vendor in place of the pump column on stone prep jobs

On the Daily Schedule, rows for stone prep work will show the stone vendor where the Pump Co. value normally appears. Everything else on the row stays the same.

## What changes

- Applies to these phases: Prep Slabs, Prep B&G Slabs, Prep Exterior Slabs.
- For those rows, the Pump Co. cell shows the stone vendor instead:
  - One stone vendor: shows its code (or name), and clicking it opens the entry's Stone details.
  - Multiple stone vendors on the same job: shows them comma-separated, click opens Stone details.
  - No stone vendor yet: shows a picker of stone vendors so it can be set right from the row (same inline behavior as today's pump picker).
- The Supplier cell is unchanged and keeps showing the concrete supplier.
- All other phases keep showing the pump vendor exactly as they do now.

## Technical notes

- `src/components/schedule/ScheduleTable.tsx`: broaden the existing `isPrepSlabs` helper (currently an exact match on "prep slabs") to match the three stone prep phase names case-insensitively, and reuse it for the Pump Co. cell.
- In the Pump Co. `TableCell`, branch on the stone-prep check: render the multi-vendor summary button when `stone_lines` has more than one distinct supplier, otherwise `renderSelectCellWithQuickEdit` bound to `stone_supplier_id` with the `stoneSuppliers` list and the `stone` quick-edit tab.
- No database or form changes; the existing Supplier-column stone rendering stays as is (it will now also cover the two additional phases via the shared helper).
