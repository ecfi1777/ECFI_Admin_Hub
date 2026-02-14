-- Fix #1: Tighten org creation to require created_by = auth.uid()
DROP POLICY "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Fix #5: Remove unused self-service membership insertion policy
-- This policy is redundant because all joins go through the secure
-- join_organization_by_invite_code() SECURITY DEFINER RPC function.
DROP POLICY "Authenticated users can create their own membership" ON public.organization_memberships;