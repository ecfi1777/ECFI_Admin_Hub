
## Force Redeploy: EditEntryDialog CSS Fix

### Problem
The code changes to `EditEntryDialog.tsx` are correct in the repository, but the live/published site does not reflect them. The publish button shows "up to date," indicating the deployment system believes the current version is already live -- but it isn't.

### Solution
Make a harmless, no-op change to `EditEntryDialog.tsx` to force a new build hash, which will allow a fresh publish/deploy.

### Steps

1. **Add a trivial comment** to `EditEntryDialog.tsx` (e.g., a comment on a blank line) to create a new file hash and trigger a rebuild.

2. **Verify** the publish button now shows "Update" instead of "Up to date."

3. **You will then need to click Publish/Update** to deploy the new build to the live site.

### Technical Details
- File: `src/components/schedule/EditEntryDialog.tsx`
- Change: Add a single comment line (e.g., `// force rebuild`) that has zero functional impact
- This will produce a new build artifact, allowing a fresh deployment

### What to verify after publishing
- Open the live URL on mobile
- Open the Edit Entry dialog from the Calendar page
- Confirm the dialog width matches the Add Entry dialog (full width minus small margin)
- Confirm the tabs are horizontally scrollable without wrapping
