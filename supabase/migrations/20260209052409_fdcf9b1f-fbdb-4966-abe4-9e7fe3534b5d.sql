CREATE OR REPLACE FUNCTION public.get_my_role(p_organization_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM organization_memberships
  WHERE user_id = auth.uid()
  AND organization_id = p_organization_id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_role(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_role(uuid) TO authenticated;