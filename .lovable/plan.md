

## Fix: Allow Managers to Delete Projects

### Problem
The delete (trash) button in the Project Details Sheet is currently restricted to owners only (`isOwner`), but the database security policy already allows managers to delete projects. This means the UI is blocking managers from an action the backend permits.

### What Changes
One small change in one file:

**`src/components/projects/ProjectDetailsSheet.tsx`** (line 285)
- Change `{isOwner && (` to `{canManage && (` for the Trash2 (delete) button
- This makes the delete icon visible to both owners and managers, matching the database-level permissions

### What Stays the Same
- "Show Deleted" checkbox on Projects page remains owner-only (the database only lets owners view soft-deleted projects)
- "Restore Project" button remains owner-only (same reason)
- All other actions (edit, archive, add entry, export, documents) are already correctly set to `canManage`

### Documents Note
The "Add Project" dialog with its Documents tab is already accessible to managers (`canManage`). If a specific user cannot see it, they may be assigned the "viewer" role rather than "manager" -- this can be verified in Settings under Team Members.

