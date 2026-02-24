

## Improve Audit Log Labels for Schedule Entries

### Current behavior
When a schedule entry is created/updated/deleted, the audit trigger builds a `record_label` like:
```
2025-01-15 - Crew 1
```
This makes it hard to identify which job the entry refers to without expanding the row.

### Proposed change
Update the `audit_schedule_entries()` database trigger function to look up the project's lot number (from `projects`) and phase name (from `phases`), and build a richer label like:
```
59-K — Footings — Jan 15, 2025
```

**Format:** `lot_number — phase_name — scheduled_date`
- Falls back gracefully if any part is NULL (e.g., no phase assigned shows `59-K — Jan 15, 2025`)

### What changes

**1 database migration** -- no frontend changes needed

The migration replaces the `audit_schedule_entries()` function body. The only change is how `v_label` is built:
- Adds two new variables: `v_lot_number` and `v_phase_name`
- Looks up `projects.lot_number` via `v_record.project_id`
- Looks up `phases.name` via `v_record.phase_id`
- Builds label as `concat_ws(' — ', lot_number, phase_name, scheduled_date)`
- Keeps crew_name lookup for the JSONB snapshot but removes it from the label

Everything else in the trigger (action detection, old/new data capture, user email lookup) stays identical.

### No frontend changes
The `AuditLogViewer.tsx` already displays `record_label` as-is in the table rows, so the improved labels will appear automatically.

### Technical detail

```sql
CREATE OR REPLACE FUNCTION public.audit_schedule_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_record schedule_entries;
  v_label text;
  v_email text;
  v_lot_number text;
  v_phase_name text;
  v_old_data jsonb := NULL;
  v_new_data jsonb := NULL;
BEGIN
  -- action + record selection (unchanged)
  IF TG_OP = 'DELETE' THEN
    v_action := 'deleted'; v_record := OLD; v_old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'created'; v_record := NEW; v_new_data := to_jsonb(NEW);
  ELSE
    v_action := 'updated'; v_record := NEW;
    v_old_data := to_jsonb(OLD); v_new_data := to_jsonb(NEW);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  -- Look up lot number and phase name for a readable label
  SELECT lot_number INTO v_lot_number
    FROM projects WHERE id = v_record.project_id;
  SELECT name INTO v_phase_name
    FROM phases WHERE id = v_record.phase_id;

  v_label := concat_ws(' — ',
    nullif(v_lot_number, ''),
    nullif(v_phase_name, ''),
    nullif(v_record.scheduled_date::text, '')
  );

  INSERT INTO audit_log (
    organization_id, user_id, user_email,
    table_name, record_id, action, record_label,
    old_data, new_data
  ) VALUES (
    v_record.organization_id, auth.uid(),
    coalesce(v_email, 'unknown'),
    'schedule_entries', v_record.id, v_action, v_label,
    v_old_data, v_new_data
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
```

### Impact
- Only affects **new** audit log entries going forward (existing entries keep their old labels)
- No performance concern -- two simple PK lookups added to a trigger that already does lookups
- No frontend file changes required
