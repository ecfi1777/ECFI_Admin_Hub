-- 1. Fix duplicate/broken DELETE policy on organization_memberships
DROP POLICY IF EXISTS "Owners can delete memberships" ON public.organization_memberships;

-- 2. Prevent owners from modifying their own membership row (defense in depth)
DROP POLICY IF EXISTS "Owners can manage memberships in their organizations" ON public.organization_memberships;
CREATE POLICY "Owners can manage other memberships"
  ON public.organization_memberships
  FOR UPDATE
  USING (
    public.user_is_org_owner(auth.uid(), organization_id)
    AND user_id <> auth.uid()
  )
  WITH CHECK (
    public.user_is_org_owner(auth.uid(), organization_id)
    AND user_id <> auth.uid()
  );

-- 3. Restrict invite_code column visibility (still writable; read via get_invite_code RPC)
REVOKE SELECT (invite_code) ON public.organizations FROM authenticated, anon;

-- 4. Move hourly_rate to a manager-only table
CREATE TABLE IF NOT EXISTS public.crew_member_rates (
  crew_member_id uuid PRIMARY KEY REFERENCES public.crew_members(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  hourly_rate numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_member_rates TO authenticated;
GRANT ALL ON public.crew_member_rates TO service_role;

ALTER TABLE public.crew_member_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view crew rates"
  ON public.crew_member_rates FOR SELECT
  USING (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can insert crew rates"
  ON public.crew_member_rates FOR INSERT
  WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can update crew rates"
  ON public.crew_member_rates FOR UPDATE
  USING (public.user_has_manage_access(auth.uid(), organization_id))
  WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can delete crew rates"
  ON public.crew_member_rates FOR DELETE
  USING (public.user_has_manage_access(auth.uid(), organization_id));

CREATE TRIGGER trg_crew_member_rates_updated_at
  BEFORE UPDATE ON public.crew_member_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Copy existing data
INSERT INTO public.crew_member_rates (crew_member_id, organization_id, hourly_rate)
SELECT id, organization_id, hourly_rate
FROM public.crew_members
WHERE hourly_rate IS NOT NULL
ON CONFLICT (crew_member_id) DO NOTHING;

-- Drop the sensitive column from crew_members
ALTER TABLE public.crew_members DROP COLUMN hourly_rate;