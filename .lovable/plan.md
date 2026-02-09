

# Global Viewer Restrictions

## Overview
Enforce comprehensive view-only access for users with the "viewer" role across the entire application. This covers navigation restrictions, hiding all mutating actions, hiding financial data, and making Settings read-only for viewers.

## Current State
- Navigation already hides Invoices, Vendor Details, Discrepancies, and Reports from viewers (minRole: "manager")
- Route guards (`ManagerRoute`) already protect those four pages at the router level
- Kanban is currently accessible to viewers (minRole: "viewer" in nav + no `ManagerRoute` wrapper)
- `useUserRole()` hook with `canManage` flag is well-established
- Schedule page partially uses `readOnly` prop via `canManage`
- Projects page has no viewer restrictions on Add, Edit, Archive actions
- ProjectDetailsSheet has no viewer restrictions on Edit, Archive, Status change
- ProjectScheduleHistory shows financial data (dollar amounts, invoice numbers) to all users
- Calendar page allows editing/adding entries for viewers
- Settings already hides manager-only tabs but Organization and Account tabs need read-only enforcement
- ProjectDocuments allows upload/delete for all users

## Changes

### 1. Navigation and Routing (AppLayout.tsx, App.tsx)
- Change Kanban's `minRole` from `"viewer"` to `"manager"` in `allNavItems` so it is hidden from viewers
- Wrap the `/kanban` route with `ManagerRoute` in `App.tsx` to block direct URL access

### 2. Projects Page (Projects.tsx)
- Import `useUserRole` and get `canManage`
- Conditionally hide the `AddProjectDialog` button when `!canManage`
- Hide the archive/unarchive action column (last TableHead + TableCell) when `!canManage`

### 3. Project Details Sheet (ProjectDetailsSheet.tsx)
- Import `useUserRole` and get `canManage`
- Hide the Edit (pencil) button, Archive button, and PDF export button when `!canManage`
- Hide the status change `Select` dropdown when `!canManage`
- Hide financial data from the schedule history: pass `canManage` down or handle in ProjectScheduleHistory

### 4. Project Schedule History (ProjectScheduleHistory.tsx)
- Accept a `readOnly` prop (or import `useUserRole` directly)
- Hide the "Edit" button on each entry when viewer
- Hide all dollar amounts: `ready_mix_invoice_amount`, `pump_invoice_amount`, `inspection_amount`
- Hide invoice numbers: `ready_mix_invoice_number`, `pump_invoice_number`, `inspection_invoice_number`, `invoice_number`
- Hide the "Invoicing" section entirely for viewers

### 5. Project Documents (ProjectDocuments.tsx)
- Accept a `readOnly` prop or import `useUserRole`
- Hide the upload drop zone and delete buttons when viewer
- Viewers can still view/open documents but cannot upload or delete

### 6. Schedule Page - DailySchedule (DailySchedule.tsx)
- Already uses `canManage` to hide "Add Entry" buttons and passes `readOnly={!canManage}` -- verify this is complete
- Hide the daily notes "Edit" button for viewers (currently visible to all)

### 7. Schedule Table (ScheduleTable.tsx)
- Already uses `readOnly` prop to hide "Need to Inv." column and Actions column
- When `readOnly` is true, make inline cells non-editable: disable click-to-edit on `renderEditableCell` and replace `Select` dropdowns with plain text display
- Hide the quick-edit (MoreVertical) buttons on crew/supplier/pump/inspection cells

### 8. Calendar View (CalendarView.tsx)
- Import `useUserRole` and get `canManage`
- Hide the `AddEntryDialog` trigger: don't pass `onAddEntry` to week/month views when `!canManage`
- Replace the `EditEntryDialog` with a read-only view or simply don't open it for viewers (navigate to schedule date instead)

### 9. Settings Page (Settings.tsx, OrganizationSettings.tsx, ChangePassword.tsx)
- Settings is already partially gated: only "Organization" and "Account" tabs show for viewers
- **OrganizationSettings**: No changes needed -- it already hides edit controls from non-owners, and the Team Members section is behind `canManage`
- **ChangePassword**: Keep as-is -- viewers should be able to change their own password (it's their account security)

### 10. Hide Financial Data Globally
Financial data appears in these locations (all need viewer guards):
- **ScheduleTable**: `to_be_invoiced` checkbox column -- already hidden via `readOnly`
- **ProjectScheduleHistory**: Dollar amounts, invoice numbers in Concrete/Pump/Inspection sections, and the Invoicing section
- **EditEntryDialog**: Invoicing tab -- not reachable if edit button is hidden
- **ProjectDetailsSheet PDF export**: Contains financial data -- hide export button for viewers (covered in step 3)

## Technical Details

### Implementation Pattern
All changes use the existing `useUserRole()` hook and its `canManage` boolean. Components that already accept a `readOnly` prop will receive `!canManage`. Components that don't will either:
1. Import `useUserRole` directly (for top-level page components), or
2. Receive a `readOnly` prop from their parent (for child components, to avoid duplicate hook calls)

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/layout/AppLayout.tsx` | Change Kanban minRole to "manager" |
| `src/App.tsx` | Wrap `/kanban` with `ManagerRoute` |
| `src/pages/Projects.tsx` | Hide Add Project button and archive column for viewers |
| `src/components/projects/ProjectDetailsSheet.tsx` | Hide edit/archive/status-change/export for viewers |
| `src/components/projects/ProjectScheduleHistory.tsx` | Hide edit buttons and all financial data for viewers |
| `src/components/projects/ProjectDocuments.tsx` | Hide upload/delete for viewers |
| `src/components/schedule/DailySchedule.tsx` | Hide daily notes edit button for viewers |
| `src/components/schedule/ScheduleTable.tsx` | Make cells read-only (plain text) when `readOnly` is true |
| `src/pages/CalendarView.tsx` | Hide add/edit entry dialogs for viewers |

### Cleanup
- Remove any now-redundant conditional checks
- Consolidate the `readOnly` / `canManage` pattern to avoid duplicate `useUserRole` calls in nested components
- Remove unused imports after changes

