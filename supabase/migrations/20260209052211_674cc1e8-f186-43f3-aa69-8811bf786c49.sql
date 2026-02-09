-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view organizations by invite code" ON public.organizations;

-- Create restrictive SELECT policy: members only
DROP POLICY IF EXISTS "Members can view own organization" ON public.organizations;
CREATE POLICY "Members can view own organization"
ON public.organizations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_memberships.organization_id = organizations.id
    AND organization_memberships.user_id = auth.uid()
  )
);

-- Create secure lookup RPC for invite code (returns name only)
CREATE OR REPLACE FUNCTION public.lookup_organization_by_invite_code(p_invite_code text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_name text;
BEGIN
  IF p_invite_code IS NULL OR trim(p_invite_code) = '' THEN
    RETURN NULL;
  END IF;

  SELECT o.name INTO v_name
  FROM public.organizations o
  WHERE upper(o.invite_code) = upper(trim(p_invite_code))
  LIMIT 1;

  RETURN v_name;
END;
$function$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION public.lookup_organization_by_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_organization_by_invite_code(text) TO authenticated;