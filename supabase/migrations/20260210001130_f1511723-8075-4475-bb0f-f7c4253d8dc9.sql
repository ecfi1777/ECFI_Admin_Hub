-- ============================================================
-- ECFI Hub — Viewer RLS Restrictions
-- Restricts INSERT/UPDATE/DELETE to owner + manager roles
-- Viewers retain SELECT (read) access only
-- ============================================================

-- =========================
-- PROJECTS TABLE
-- =========================

DROP POLICY IF EXISTS "Users can delete projects in their org" ON projects;
DROP POLICY IF EXISTS "Users can insert projects in their org" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their org" ON projects;

CREATE POLICY "Managers can insert projects in their org"
ON projects FOR INSERT
WITH CHECK (
  public.user_has_manage_access(auth.uid(), organization_id)
);

CREATE POLICY "Managers can update projects in their org"
ON projects FOR UPDATE
USING (
  public.user_has_manage_access(auth.uid(), organization_id)
);

CREATE POLICY "Managers can delete projects in their org"
ON projects FOR DELETE
USING (
  public.user_has_manage_access(auth.uid(), organization_id)
);

-- =========================
-- SCHEDULE_ENTRIES TABLE
-- =========================

DROP POLICY IF EXISTS "Users can delete entries in their org" ON schedule_entries;
DROP POLICY IF EXISTS "Users can insert entries in their org" ON schedule_entries;
DROP POLICY IF EXISTS "Users can update entries in their org" ON schedule_entries;

CREATE POLICY "Managers can insert entries in their org"
ON schedule_entries FOR INSERT
WITH CHECK (
  public.user_has_manage_access(auth.uid(), organization_id)
);

CREATE POLICY "Managers can update entries in their org"
ON schedule_entries FOR UPDATE
USING (
  public.user_has_manage_access(auth.uid(), organization_id)
);

CREATE POLICY "Managers can delete entries in their org"
ON schedule_entries FOR DELETE
USING (
  public.user_has_manage_access(auth.uid(), organization_id)
);