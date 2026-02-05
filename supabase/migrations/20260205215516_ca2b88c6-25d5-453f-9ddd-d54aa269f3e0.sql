-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Owners can update their organization" ON public.organizations;

-- Create a new policy that allows owners to update organizations they own
CREATE POLICY "Owners can update their organization" 
ON public.organizations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM organization_memberships 
    WHERE organization_memberships.organization_id = organizations.id 
    AND organization_memberships.user_id = auth.uid() 
    AND organization_memberships.role = 'owner'
  )
);