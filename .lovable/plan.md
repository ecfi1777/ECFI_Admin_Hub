## Problem

When you edit a Prep Slabs entry and add a second stone supplier, both your existing supplier and the new one disappear after save. Reopening shows only the original supplier.

## Root cause

In `src/components/schedule/EditEntryDialog.tsx`, the query that loads the full entry (`useQuery` keyed `schedule-entry-full`) selects `*` plus several related tables — but it does **not** include the new `schedule_entry_stone_lines` relation. So:

1. `fullEntry.stone_lines` is always `undefined` when the edit dialog opens.
2. `loadFromEntry` falls back to the legacy single-supplier safety net and builds **one** synthesized stone line with **no `id`** (mirrored from the legacy `stone_*` columns on `schedule_entries`).
3. When you add a second supplier and save, the sync logic sees `originalIds` as empty and treats **both** lines as inserts. The real, already-saved line in `schedule_entry_stone_lines` is never updated and a duplicate row is inserted alongside the new one.
4. On reopen, the dialog still doesn't fetch `stone_lines`, so you only see the one line synthesized from the legacy columns (which only ever store line 1's values). The second supplier you entered "vanishes" from the UI even though orphan rows now exist in the table.

## Fix

Single, minimal change to `EditEntryDialog.tsx`:

- Extend the `useQuery` select string to also pull the stone lines relation, e.g.:
  ```
  stone_lines:schedule_entry_stone_lines (
    id, supplier_id, stone_type_id, qty_ordered, order_number,
    invoice_number, invoice_amount, tons_billed, notes, display_order
  )
  ```
- Order by `display_order` (either via PostgREST `order` modifier or a client-side sort inside `loadFromEntry`) so suppliers come back in the order you saved them.

That's all that's needed — `loadFromEntry` already prefers `entry.stone_lines` over the legacy fallback, and the save-time diff (`idsToDelete`, `toInsert`, `toUpdate`) already works correctly once it sees the real existing line ids.

## Data cleanup (optional, recommended)

Because previous saves may have inserted duplicate rows for the affected entries, I'll also run a one-off cleanup that, for each `schedule_entry_id`, keeps the oldest row per (`supplier_id`, `stone_type_id`) pair and deletes any later exact duplicates. I'll show you the candidate rows first and only delete after you confirm.

## Out of scope

- No schema changes.
- No changes to `AddEntryDialog`, `useEntryForm`, `StoneTab`, or the Schedule History view — those already handle multi-line stone correctly.
