-- Add DELETE policy for organization owners to delete their organization
CREATE POLICY "Owners can delete their organization" 
ON public.organizations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM organization_memberships 
    WHERE organization_memberships.organization_id = organizations.id 
    AND organization_memberships.user_id = auth.uid() 
    AND organization_memberships.role = 'owner'
  )
);

-- Add DELETE policy for organization memberships (needed for cleanup and removing members)
CREATE POLICY "Owners can delete memberships in their organization" 
ON public.organization_memberships 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM organization_memberships AS om 
    WHERE om.organization_id = organization_memberships.organization_id 
    AND om.user_id = auth.uid() 
    AND om.role = 'owner'
  )
);