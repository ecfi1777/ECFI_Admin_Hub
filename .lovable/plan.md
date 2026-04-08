

## Add Delete Button to "Did Not Work" Rows

### Summary
Add a trash/delete button next to the existing pencil/edit button in the `isDidNotWork` row block of `ScheduleTable.tsx`.

### Changes

**File: `src/components/schedule/ScheduleTable.tsx`**

1. Ensure `Trash2` is imported from `lucide-react` (likely already imported for regular entry rows)
2. Find the `isDidNotWork` block's `{!readOnly && (` section containing only the pencil button
3. Wrap both buttons in a Fragment (`<>...</>`) and add the trash button with `setDeleteEntryId(entry.id)` onClick — exactly as specified in the user's prompt

No other files or logic need changes. The existing `deleteMutation` and `AlertDialog` confirmation flow already handle deletion.

