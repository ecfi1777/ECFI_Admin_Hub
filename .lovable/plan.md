

## Storage Usage Indicator for Settings Page

### Overview
Add an owner-only "Storage Usage" card to the Organization Settings tab showing current database and file storage usage as progress bars with percentages.

### What You'll See
A new card (visible only to organization owners) on the Organization tab of Settings, positioned between "Team Members" and "Danger Zone". It will show:
- Database storage usage bar (e.g., "13 MB / 500 MB - 2.6%")
- File storage usage bar (e.g., "27 MB / 1 GB - 2.7%")
- Color-coded progress bars: green (under 70%), yellow (70-90%), red (over 90%)

### Technical Details

#### 1. Create a new component: `src/components/settings/StorageUsageCard.tsx`
- Owner-only card with two progress bars
- Uses two queries:
  - **Database size**: SQL RPC call using `pg_database_size(current_database())`
  - **File storage size**: Query `storage.objects` to sum file sizes
- Since we can't query `pg_database_size` from the client SDK directly, we'll create a database function to expose this safely

#### 2. Database migration: Create a `get_storage_usage()` function
```sql
CREATE OR REPLACE FUNCTION public.get_storage_usage()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_db_bytes bigint;
  v_file_bytes bigint;
BEGIN
  -- Only owners can call this
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND role = 'owner'
  ) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT pg_database_size(current_database()) INTO v_db_bytes;

  SELECT coalesce(sum((metadata->>'size')::bigint), 0)
  INTO v_file_bytes
  FROM storage.objects;

  RETURN jsonb_build_object(
    'db_bytes', v_db_bytes,
    'file_bytes', v_file_bytes
  );
END;
$$;
```

#### 3. Add `StorageUsageCard` to `OrganizationSettings.tsx`
- Import and render the new component inside the owner-only section, between "Team Members" and "Danger Zone"
- Uses `useQuery` to call the RPC function with a 5-minute stale time
- Displays two `Progress` bars from the existing UI components
- Plan limits hardcoded as constants (500 MB database, 1 GB file storage) with a comment to update if the plan changes

#### 4. Files changed
| File | Action |
|------|--------|
| `src/components/settings/StorageUsageCard.tsx` | Create |
| `src/components/settings/OrganizationSettings.tsx` | Add import and render StorageUsageCard |
| New migration SQL | Create `get_storage_usage()` function |

