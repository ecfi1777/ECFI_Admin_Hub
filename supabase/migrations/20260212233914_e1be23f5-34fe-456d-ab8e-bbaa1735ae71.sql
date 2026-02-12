
CREATE OR REPLACE FUNCTION public.audit_projects()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action text;
  v_record projects;
  v_label text;
  v_email text;
  v_location_name text;
  v_old_data jsonb := NULL;
  v_new_data jsonb := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_record := OLD;
    v_old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_record := NEW;
    v_new_data := to_jsonb(NEW);
  ELSE
    -- Detect soft-delete: deleted_at changed from NULL to a value
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'deleted';
    -- Detect restore: deleted_at changed from a value to NULL
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      v_action := 'restored';
    ELSE
      v_action := 'updated';
    END IF;
    v_record := NEW;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT name INTO v_location_name FROM locations WHERE id = v_record.location_id;

  v_label := concat_ws(', ', nullif(v_location_name, ''), nullif(v_record.lot_number, ''));

  INSERT INTO audit_log (organization_id, user_id, user_email, table_name, record_id, action, record_label, old_data, new_data)
  VALUES (v_record.organization_id, auth.uid(), coalesce(v_email, 'unknown'), 'projects', v_record.id, v_action, v_label, v_old_data, v_new_data);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
