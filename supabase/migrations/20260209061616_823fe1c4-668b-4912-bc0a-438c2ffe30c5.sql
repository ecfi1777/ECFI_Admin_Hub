-- Drop the old policy that uses unreliable auth.role() check
DROP POLICY "Authenticated users can create organizations" ON public.organizations;

-- Create the new policy scoped to the authenticated role
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);