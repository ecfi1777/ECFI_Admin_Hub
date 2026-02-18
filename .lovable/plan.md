

## Fix: Add "restored" to audit_log action check constraint

### Problem
The `audit_log` table has a check constraint (`audit_log_action_check`) that only permits the values `created`, `updated`, and `deleted`. When a project is restored (soft-delete reversed), the updated trigger function tries to log a `restored` action, which violates this constraint and causes the "Restore failed" error.

### Solution
A single database migration to drop the existing constraint and recreate it with `restored` included:

```sql
ALTER TABLE public.audit_log DROP CONSTRAINT audit_log_action_check;
ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_action_check
  CHECK (action = ANY (ARRAY['created', 'updated', 'deleted', 'restored']));
```

No frontend code changes are needed -- the `AuditLogViewer` already has styling for the `restored` action badge.

### Technical Details
- **File changed**: One new SQL migration only
- **Risk**: None -- this is purely additive (no existing data is affected)
- **Result**: Restoring a deleted project will correctly log a `restored` action in the Activity Log, and the restore operation will succeed without constraint violations

