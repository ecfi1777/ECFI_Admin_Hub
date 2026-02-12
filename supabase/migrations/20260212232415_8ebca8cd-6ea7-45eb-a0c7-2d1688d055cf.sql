
-- 1. Add soft-delete column
ALTER TABLE public.projects ADD COLUMN deleted_at timestamptz DEFAULT NULL;

-- 2. Add partial index for efficient filtering
CREATE INDEX idx_projects_deleted_at ON public.projects(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 3. Update existing SELECT policy to exclude soft-deleted projects
DROP POLICY IF EXISTS "Users can view projects in their org" ON public.projects;
CREATE POLICY "Users can view projects in their org"
  ON public.projects FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM organization_memberships
      WHERE organization_memberships.user_id = auth.uid()
        AND organization_memberships.organization_id = projects.organization_id
    )
  );

-- 4. New SELECT policy: owners can view soft-deleted projects
CREATE POLICY "Owners can view soft-deleted projects"
  ON public.projects FOR SELECT
  USING (
    deleted_at IS NOT NULL
    AND public.user_is_org_owner(auth.uid(), organization_id)
  );
