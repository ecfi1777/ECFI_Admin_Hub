
-- 1. Unique constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_memberships_org_user_unique'
  ) THEN
    ALTER TABLE public.organization_memberships
      ADD CONSTRAINT organization_memberships_org_user_unique
      UNIQUE (organization_id, user_id);
  END IF;
END $$;

-- 2. Join RPC — RETURNS TABLE, not json
CREATE OR REPLACE FUNCTION public.join_organization_by_invite_code(p_invite_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_org_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_invite_code IS NULL OR trim(p_invite_code) = '' THEN
    RAISE EXCEPTION 'Invite code is required';
  END IF;

  SELECT o.id, o.name INTO v_org_id, v_org_name
  FROM public.organizations o
  WHERE upper(o.invite_code) = upper(trim(p_invite_code))
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO public.organization_memberships (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'viewer')
  ON CONFLICT ON CONSTRAINT organization_memberships_org_user_unique DO NOTHING;

  RETURN QUERY SELECT v_org_id, v_org_name;
END;
$$;

REVOKE ALL ON FUNCTION public.join_organization_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_organization_by_invite_code(text) TO authenticated;
