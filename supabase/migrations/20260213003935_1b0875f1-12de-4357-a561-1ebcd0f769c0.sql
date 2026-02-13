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