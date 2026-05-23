# Stone Multi-Supplier Display & Numeric Tons

## 1. Fetch stone lines with schedule entries
**File:** `src/components/schedule/DailySchedule.tsx`
Extend the `schedule_entries` select to also pull `stone_lines:schedule_entry_stone_lines(id, supplier_id, qty_ordered, stone_suppliers:suppliers(name, code))`.

## 2. Supplier cell — comma-separated names (Prep Slabs)
**File:** `src/components/schedule/ScheduleTable.tsx` (Prep Slabs branch, ~lines 808–816)
- Build a deduped list of supplier labels from `entry.stone_lines` (prefer `code`, fallback `name`).
- If 2+ unique suppliers: render plain text like `Sloan, Luna` (centered, `text-xs`, truncate w/ title tooltip). Click opens Edit Entry dialog.
- If 0 or 1 supplier: keep current dropdown behavior unchanged.

## 3. Qty Ord cell — sum of tons (Prep Slabs)
**File:** `src/components/schedule/ScheduleTable.tsx` (Qty Ord cell, ~lines 826–831)
- For Prep Slabs entries: compute `sum = Σ parseFloat(line.qty_ordered)` (skip NaN/empty). Render the total or `-`. Click opens Edit Entry dialog. No inline editing here (value is computed).
- Non-Prep-Slabs entries: keep existing editable `entry.qty_ordered` behavior.

## 4. Stone tab — "Tons" label + numeric-only input
**File:** `src/components/schedule/entry-form/tabs/StoneTab.tsx`
- Rename per-line "Qty Ordered" label to **"Tons"**.
- Change `<Input>` to `type="number"` with `step="0.01"` and `min="0"`.
- DB column `qty_ordered` stays `text`; we store the raw numeric string.

## Out of scope
- No DB migrations.
- Calendar, Reports, Project Schedule History views (they already render lines individually).
- No inline editing of stone-line tons from the Daily Schedule table — still via the Edit Entry modal.
