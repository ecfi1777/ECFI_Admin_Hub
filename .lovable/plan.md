# Why the stone vendor isn't showing, and the fix

The change is in place: on Daily Schedule rows for Prep Slabs, Prep B&G Slabs and Prep Exterior Slabs, the Pump Co. cell already shows the stone vendor instead of the pump vendor.

The row in your screenshot shows a dash because **no stone vendor has been chosen on that job**. Checking the Sep 7 entry (Schaefer Homes / Norris Woods / 44): it has one stone line with 43.1 tons and an invoice, but the supplier field is empty — matching the "Select supplier" you see in the Stone tab.

So there is nothing to display yet. Two things worth fixing so this can't happen again:

## What changes

1. **Make the dropdown on the row actually set the stone vendor on the stone line.**
   Today the little picker in that cell saves to an older, unused vendor field on the entry, so a vendor picked there wouldn't reach the Stone tab, the P&L, or vendor bills. It will instead set the supplier on the job's stone line (creating one if none exists), so the row, the Stone tab, and the cost reports all agree.

2. **Flag the missing vendor.** When a stone prep job has stone tons or a stone invoice but no vendor selected, the cell shows a clear "Set vendor" prompt instead of a plain dash, so incomplete jobs stand out.

## Technical notes

- `src/components/schedule/ScheduleTable.tsx`: in the Pump Co. cell's stone branch, replace the `renderSelectCellWithQuickEdit(entry, "stone_supplier_id", ...)` call with a stone-line-aware select. On change, update `schedule_entry_stone_lines.supplier_id` for the entry's single line, or insert a line (with `organization_id`, `schedule_entry_id`, `display_order`) when none exists, then invalidate the schedule queries.
- Keep the multi-vendor read-only summary button as is; the picker only appears when zero distinct vendor labels exist.
- The empty-state label becomes "Set vendor" when `stone_lines` has tons or invoice data but no supplier; plain "-" otherwise.
- No database or form changes; the Supplier column and all non-stone phases are untouched.
