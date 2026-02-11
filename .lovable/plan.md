
# Audit Log Viewer UI

## Overview
Add an "Activity Log" tab to the Settings page, visible only to organization owners. It will display a searchable, filterable table of recent audit log entries showing who did what and when.

## What You'll See
- A new **"Activity Log"** tab in Settings (only visible if you are the organization owner)
- A table showing: timestamp, user email, action (created/updated/deleted), table (Projects/Schedule), record label, and record ID
- Filters for action type and table name
- Pagination to browse through entries (25 per page)
- Color-coded action badges (green for created, blue for updated, red for deleted)

## Technical Details

### 1. New Component: `src/components/settings/AuditLogViewer.tsx`
- Fetches from the `audit_log` table using Supabase client, scoped to the current organization
- Uses `@tanstack/react-query` for data fetching (consistent with existing patterns)
- Implements client-side filters for action type and table name
- Paginated with offset-based queries (25 rows per page)
- Displays friendly labels: "Projects" instead of "projects", "Schedule Entries" instead of "schedule_entries"
- Uses existing UI components: Table, Select, Badge, Button, Card, Skeleton

### 2. Update: `src/pages/Settings.tsx`
- Add a new tab entry: `{ value: "activity_log", label: "Activity Log", table: null, minRole: "owner" }`
- Since the existing tab filtering uses `canManage` (owner or manager), add a new check for `isOwner` from `useUserRole` to support owner-only tabs
- Render `AuditLogViewer` when the activity_log tab is active

### 3. Access Control
- Tab only appears for owners (enforced in the tab filter logic)
- Data access is already secured by the existing RLS policy (`user_is_org_owner`)
