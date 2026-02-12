
-- 1. Add JSONB snapshot columns
ALTER TABLE public.audit_log ADD COLUMN old_data jsonb DEFAULT NULL;
ALTER TABLE public.audit_log ADD COLUMN new_data jsonb DEFAULT NULL;

-- 2. Update projects audit trigger
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
    v_action := 'updated';
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

-- 3. Update schedule_entries audit trigger
CREATE OR REPLACE FUNCTION public.audit_schedule_entries()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action text;
  v_record schedule_entries;
  v_label text;
  v_email text;
  v_crew_name text;
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
    v_action := 'updated';
    v_record := NEW;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  SELECT name INTO v_crew_name FROM crews WHERE id = v_record.crew_id;

  v_label := concat_ws(' - ', nullif(v_record.scheduled_date::text, ''), nullif(v_crew_name, ''));

  INSERT INTO audit_log (organization_id, user_id, user_email, table_name, record_id, action, record_label, old_data, new_data)
  VALUES (v_record.organization_id, auth.uid(), coalesce(v_email, 'unknown'), 'schedule_entries', v_record.id, v_action, v_label, v_old_data, v_new_data);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
