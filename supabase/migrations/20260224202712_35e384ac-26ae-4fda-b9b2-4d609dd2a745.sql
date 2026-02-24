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
  IF TG_OP = 'DELETE' THEN
    v_action := 'deleted'; v_record := OLD; v_old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'created'; v_record := NEW; v_new_data := to_jsonb(NEW);
  ELSE
    v_action := 'updated'; v_record := NEW;
    v_old_data := to_jsonb(OLD); v_new_data := to_jsonb(NEW);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

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