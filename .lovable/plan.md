# Fix: Qty Ord input clips the entered number

## Problem
In the daily schedule, the **Qty Ord** column is only ~56px wide (`w-14`), but the inline editor uses the standard `<Input>` component, which has `px-3` padding plus a border. When focused, the browser auto-scrolls the input so the caret stays visible, which pushes the digit out of the visible area. The number only reappears after clicking off, when the cell renders as a plain span again.

## Fix
Edit `renderEditableCell` in `src/components/schedule/ScheduleTable.tsx` so the inline `<Input>` fits properly in narrow numeric columns:

1. Add a tight-padding, centered variant for the editing input: `px-1 text-center` (keep `h-7 text-sm w-full`). This recovers ~20px of horizontal space and matches the way the value is displayed in the cell.
2. Also widen the **Qty Ord** column header from `w-14` to `w-16` so 3-digit values (e.g. `120`) still fit comfortably while focused.

No data, mutation, or business logic changes — purely a presentation fix in `ScheduleTable.tsx`.

## Out of scope
- Other inline editable cells appear in wider columns and don't show the issue. If you want me to apply the same tight padding to all of them for consistency, say the word and I'll include that.
