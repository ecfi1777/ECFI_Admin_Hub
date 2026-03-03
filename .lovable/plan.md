

# Google Drive Integration — Full Implementation Plan

All 5 secrets are now confirmed and ready to store:

| Secret | Value |
|--------|-------|
| GOOGLE_CLIENT_ID | `993703510072-...apps.googleusercontent.com` |
| GOOGLE_CLIENT_SECRET | `GOCSPX-Zq0Umo...` |
| GOOGLE_API_KEY | `AIzaSyDs8yGx...` |
| GOOGLE_REFRESH_TOKEN | `1//05rMy6fIMpt...` |
| GOOGLE_DRIVE_SHARE_EMAIL | `elan@easternconcrete.com` |

## Implementation Steps

### 1. Store all 5 secrets
Add each secret to the backend secrets store.

### 2. Database migration
- Add `google_drive_folder_id TEXT` to `projects`
- Add `drive_file_id TEXT`, `drive_file_url TEXT`, `storage_type TEXT DEFAULT 'supabase'` to `project_documents`
- Create `project_drive_folders` table (project_id, organization_id, category, drive_folder_id) with RLS policies scoped to org membership

### 3. Create edge function: `create-drive-folders`
- Exchanges refresh token for access token via Google OAuth2
- Finds or creates "ECFI Hub" root folder, shares with owner email
- Creates `{builder_code}_{location}_{lot}` project folder with 7 subfolders
- Returns folder IDs and URLs
- JWT validation in code, CORS headers

### 4. Create edge function: `get-picker-token`
- Exchanges refresh token for short-lived access token
- Returns access_token, api_key, client_id for Google Picker
- JWT validation in code, CORS headers

### 5. Update `supabase/config.toml`
Add both functions with `verify_jwt = false`.

### 6. Create `src/types/google-picker.d.ts`
Type declarations for `google.picker` namespace.

### 7. Update `AddProjectDialog.tsx`
- After project creation, call `create-drive-folders` with builder code, location, lot
- Save folder URL to project, subfolder mappings to `project_drive_folders`
- Non-blocking: if Drive fails, show warning toast, project still created

### 8. Update `ProjectDocuments.tsx`
- Load Google Picker API (`gapi`) on mount
- "Upload to Drive" button per category (scoped to subfolder)
- Handle both `google_drive` and `supabase` storage types for viewing/deleting
- Keep existing FileDropZone as fallback

### 9. Update `ProjectFormFields.tsx`
- Replace manual Google Drive URL input with read-only auto-generated link
- "Open in Google Drive" button when URL exists

## Backward Compatibility
- Existing Supabase Storage documents continue to work via `storage_type='supabase'` default
- No existing upload code is removed

