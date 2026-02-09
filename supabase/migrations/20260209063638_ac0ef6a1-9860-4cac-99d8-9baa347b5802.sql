
-- Fix privilege escalation: restrict self-created memberships to 'viewer' role only
DROP POLICY IF EXISTS "Authenticated users can create their own membership" ON public.organization_memberships;

CREATE POLICY "Authenticated users can create their own membership"
ON public.organization_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'viewer'
);
