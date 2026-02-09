
-- Owner-only RPC to retrieve invite code
CREATE OR REPLACE FUNCTION public.get_invite_code(p_organization_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_code text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid()
    AND organization_id = p_organization_id
    AND role = 'owner'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT invite_code INTO v_code
  FROM organizations
  WHERE id = p_organization_id;

  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invite_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_code(uuid) TO authenticated;
