
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can view profiles of people in their organization
CREATE POLICY "Users can view org member profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_memberships my_mem
    JOIN organization_memberships their_mem 
      ON my_mem.organization_id = their_mem.organization_id
    WHERE my_mem.user_id = auth.uid()
      AND their_mem.user_id = profiles.user_id
  )
);
