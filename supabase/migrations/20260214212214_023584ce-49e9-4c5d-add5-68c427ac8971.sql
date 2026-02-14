
-- Fix #3: Create RPC to log restore/rollback actions in audit_log
-- This bypasses the "no direct inserts" RLS policy via SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_restore_action(
  p_table_name text,
  p_record_id uuid,
  p_record_label text,
  p_organization_id uuid,
  p_old_data jsonb,
  p_new_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Only org owners can log restore actions
  IF NOT user_is_org_owner(auth.uid(), p_organization_id) THEN
    RAISE EXCEPTION 'Unauthorized: only owners can restore records';
  END IF;

  -- Get the caller's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  INSERT INTO audit_log (
    action, table_name, record_id, record_label,
    organization_id, user_id, user_email,
    old_data, new_data
  ) VALUES (
    'restored', p_table_name, p_record_id, p_record_label,
    p_organization_id, auth.uid(), COALESCE(v_user_email, 'unknown'),
    p_old_data, p_new_data
  );
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION public.log_restore_action FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_restore_action TO authenticated;
