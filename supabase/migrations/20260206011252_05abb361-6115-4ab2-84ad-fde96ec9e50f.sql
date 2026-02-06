-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view memberships in their organization" 
  ON organization_memberships;
DROP POLICY IF EXISTS "Owners can manage memberships" 
  ON organization_memberships;

-- Create corrected SELECT policy
-- Allows viewing memberships for ALL organizations the user belongs to
CREATE POLICY "Users can view memberships in their organizations"
  ON organization_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_memberships.organization_id
    )
    OR (user_id = auth.uid())
  );

-- Create corrected UPDATE policy  
-- Allows managing memberships in ANY organization where user is an owner
CREATE POLICY "Owners can manage memberships in their organizations"
  ON organization_memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_memberships.organization_id
      AND om.role = 'owner'
    )
  );