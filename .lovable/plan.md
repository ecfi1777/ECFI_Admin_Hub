

## Auto-Delete When Unchecking "Did Not Work" Without Project

### Summary
When a user unchecks "Did not work" on an entry that has no project, instead of showing an error toast, automatically soft-delete the entry.

### Important Note
The user's code references `newProjectId`, but this variable does not exist in the component or the form state — there is no project selector shown when editing a "did not work" entry. The condition will use `!entry?.project_id` only, which is functionally equivalent since `newProjectId` would always be undefined/falsy.

### Changes — `src/components/schedule/EditEntryDialog.tsx`

**1. Add deleteMutation** (after `updateMutation`, ~line 124):
- Soft-deletes the entry by setting `deleted: true` and `deleted_at` to current timestamp
- On success: invalidates schedule queries, shows "Entry removed" toast, closes dialog
- On error: shows user-friendly error toast

**2. Replace handleSave** (lines 126-136):
- Keep the "did not work without reason" validation
- Replace the error toast for "no project" with `deleteMutation.mutate()` + return
- Otherwise proceed with `updateMutation.mutate()`

**3. Update Save button disabled prop** (line 299):
- Change `disabled={updateMutation.isPending}` to `disabled={updateMutation.isPending || deleteMutation.isPending}`

### No other files changed

