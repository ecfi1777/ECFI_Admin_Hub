-- Drop the policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view memberships in their organizations" 
  ON organization_memberships;

-- Create a security definer function to check membership without recursion
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(p_user_id uuid, p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
  )
$$;

-- Create a security definer function to check if user is owner of an organization
CREATE OR REPLACE FUNCTION public.user_is_org_owner(p_user_id uuid, p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND role = 'owner'
  )
$$;

-- Create corrected SELECT policy using the security definer function
CREATE POLICY "Users can view memberships in their organizations"
  ON organization_memberships FOR SELECT
  USING (
    public.user_belongs_to_organization(auth.uid(), organization_id)
    OR (user_id = auth.uid())
  );

-- Drop and recreate the UPDATE policy using the security definer function
DROP POLICY IF EXISTS "Owners can manage memberships in their organizations" 
  ON organization_memberships;

CREATE POLICY "Owners can manage memberships in their organizations"
  ON organization_memberships FOR UPDATE
  USING (
    public.user_is_org_owner(auth.uid(), organization_id)
  );