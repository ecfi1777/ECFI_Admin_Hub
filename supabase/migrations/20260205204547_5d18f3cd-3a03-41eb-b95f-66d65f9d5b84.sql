-- Create a function that validates if a user has access to a specific organization
-- This allows us to check membership for any org the user belongs to
CREATE OR REPLACE FUNCTION public.user_has_organization_access(p_user_id uuid, p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = p_user_id
    AND organization_id = p_organization_id
  );
$$;

-- Update RLS policies to allow access to ANY organization the user is a member of
-- This enables multi-organization support

-- builders
DROP POLICY IF EXISTS "Users can view builders in their org" ON builders;
CREATE POLICY "Users can view builders in their org" ON builders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = builders.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert builders in their org" ON builders;
CREATE POLICY "Users can insert builders in their org" ON builders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = builders.organization_id)
  );

DROP POLICY IF EXISTS "Users can update builders in their org" ON builders;
CREATE POLICY "Users can update builders in their org" ON builders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = builders.organization_id)
  );

-- concrete_mixes
DROP POLICY IF EXISTS "Users can view concrete_mixes in their org" ON concrete_mixes;
CREATE POLICY "Users can view concrete_mixes in their org" ON concrete_mixes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = concrete_mixes.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert concrete_mixes in their org" ON concrete_mixes;
CREATE POLICY "Users can insert concrete_mixes in their org" ON concrete_mixes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = concrete_mixes.organization_id)
  );

DROP POLICY IF EXISTS "Users can update concrete_mixes in their org" ON concrete_mixes;
CREATE POLICY "Users can update concrete_mixes in their org" ON concrete_mixes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = concrete_mixes.organization_id)
  );

-- crew_members
DROP POLICY IF EXISTS "Users can view crew_members in their org" ON crew_members;
CREATE POLICY "Users can view crew_members in their org" ON crew_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_members.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert crew_members in their org" ON crew_members;
CREATE POLICY "Users can insert crew_members in their org" ON crew_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_members.organization_id)
  );

DROP POLICY IF EXISTS "Users can update crew_members in their org" ON crew_members;
CREATE POLICY "Users can update crew_members in their org" ON crew_members
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_members.organization_id)
  );

DROP POLICY IF EXISTS "Users can delete crew_members in their org" ON crew_members;
CREATE POLICY "Users can delete crew_members in their org" ON crew_members
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_members.organization_id)
  );

-- crews
DROP POLICY IF EXISTS "Users can view crews in their org" ON crews;
CREATE POLICY "Users can view crews in their org" ON crews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crews.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert crews in their org" ON crews;
CREATE POLICY "Users can insert crews in their org" ON crews
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crews.organization_id)
  );

DROP POLICY IF EXISTS "Users can update crews in their org" ON crews;
CREATE POLICY "Users can update crews in their org" ON crews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crews.organization_id)
  );

-- daily_notes
DROP POLICY IF EXISTS "Users can view daily_notes in their org" ON daily_notes;
CREATE POLICY "Users can view daily_notes in their org" ON daily_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = daily_notes.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert daily_notes in their org" ON daily_notes;
CREATE POLICY "Users can insert daily_notes in their org" ON daily_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = daily_notes.organization_id)
  );

DROP POLICY IF EXISTS "Users can update daily_notes in their org" ON daily_notes;
CREATE POLICY "Users can update daily_notes in their org" ON daily_notes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = daily_notes.organization_id)
  );

-- inspection_types
DROP POLICY IF EXISTS "Users can view inspection_types in their org" ON inspection_types;
CREATE POLICY "Users can view inspection_types in their org" ON inspection_types
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = inspection_types.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert inspection_types in their org" ON inspection_types;
CREATE POLICY "Users can insert inspection_types in their org" ON inspection_types
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = inspection_types.organization_id)
  );

DROP POLICY IF EXISTS "Users can update inspection_types in their org" ON inspection_types;
CREATE POLICY "Users can update inspection_types in their org" ON inspection_types
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = inspection_types.organization_id)
  );

-- inspectors
DROP POLICY IF EXISTS "Users can view inspectors in their org" ON inspectors;
CREATE POLICY "Users can view inspectors in their org" ON inspectors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = inspectors.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert inspectors in their org" ON inspectors;
CREATE POLICY "Users can insert inspectors in their org" ON inspectors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = inspectors.organization_id)
  );

DROP POLICY IF EXISTS "Users can update inspectors in their org" ON inspectors;
CREATE POLICY "Users can update inspectors in their org" ON inspectors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = inspectors.organization_id)
  );

-- locations
DROP POLICY IF EXISTS "Users can view locations in their org" ON locations;
CREATE POLICY "Users can view locations in their org" ON locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = locations.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert locations in their org" ON locations;
CREATE POLICY "Users can insert locations in their org" ON locations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = locations.organization_id)
  );

DROP POLICY IF EXISTS "Users can update locations in their org" ON locations;
CREATE POLICY "Users can update locations in their org" ON locations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = locations.organization_id)
  );

-- phases
DROP POLICY IF EXISTS "Users can view phases in their org" ON phases;
CREATE POLICY "Users can view phases in their org" ON phases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = phases.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert phases in their org" ON phases;
CREATE POLICY "Users can insert phases in their org" ON phases
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = phases.organization_id)
  );

DROP POLICY IF EXISTS "Users can update phases in their org" ON phases;
CREATE POLICY "Users can update phases in their org" ON phases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = phases.organization_id)
  );

-- project_documents
DROP POLICY IF EXISTS "Users can view project_documents in their org" ON project_documents;
CREATE POLICY "Users can view project_documents in their org" ON project_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_documents.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert project_documents in their org" ON project_documents;
CREATE POLICY "Users can insert project_documents in their org" ON project_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_documents.organization_id)
  );

DROP POLICY IF EXISTS "Users can update project_documents in their org" ON project_documents;
CREATE POLICY "Users can update project_documents in their org" ON project_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_documents.organization_id)
  );

DROP POLICY IF EXISTS "Users can delete project_documents in their org" ON project_documents;
CREATE POLICY "Users can delete project_documents in their org" ON project_documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_documents.organization_id)
  );

-- project_statuses
DROP POLICY IF EXISTS "Users can view statuses in their org" ON project_statuses;
CREATE POLICY "Users can view statuses in their org" ON project_statuses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_statuses.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert statuses in their org" ON project_statuses;
CREATE POLICY "Users can insert statuses in their org" ON project_statuses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_statuses.organization_id)
  );

DROP POLICY IF EXISTS "Users can update statuses in their org" ON project_statuses;
CREATE POLICY "Users can update statuses in their org" ON project_statuses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_statuses.organization_id)
  );

-- projects
DROP POLICY IF EXISTS "Users can view projects in their org" ON projects;
CREATE POLICY "Users can view projects in their org" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = projects.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert projects in their org" ON projects;
CREATE POLICY "Users can insert projects in their org" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = projects.organization_id)
  );

DROP POLICY IF EXISTS "Users can update projects in their org" ON projects;
CREATE POLICY "Users can update projects in their org" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = projects.organization_id)
  );

DROP POLICY IF EXISTS "Users can delete projects in their org" ON projects;
CREATE POLICY "Users can delete projects in their org" ON projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = projects.organization_id)
  );

-- pump_vendors
DROP POLICY IF EXISTS "Users can view pump_vendors in their org" ON pump_vendors;
CREATE POLICY "Users can view pump_vendors in their org" ON pump_vendors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = pump_vendors.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert pump_vendors in their org" ON pump_vendors;
CREATE POLICY "Users can insert pump_vendors in their org" ON pump_vendors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = pump_vendors.organization_id)
  );

DROP POLICY IF EXISTS "Users can update pump_vendors in their org" ON pump_vendors;
CREATE POLICY "Users can update pump_vendors in their org" ON pump_vendors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = pump_vendors.organization_id)
  );

-- schedule_entries
DROP POLICY IF EXISTS "Users can view entries in their org" ON schedule_entries;
CREATE POLICY "Users can view entries in their org" ON schedule_entries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = schedule_entries.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert entries in their org" ON schedule_entries;
CREATE POLICY "Users can insert entries in their org" ON schedule_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = schedule_entries.organization_id)
  );

DROP POLICY IF EXISTS "Users can update entries in their org" ON schedule_entries;
CREATE POLICY "Users can update entries in their org" ON schedule_entries
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = schedule_entries.organization_id)
  );

DROP POLICY IF EXISTS "Users can delete entries in their org" ON schedule_entries;
CREATE POLICY "Users can delete entries in their org" ON schedule_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = schedule_entries.organization_id)
  );

-- suppliers
DROP POLICY IF EXISTS "Users can view suppliers in their org" ON suppliers;
CREATE POLICY "Users can view suppliers in their org" ON suppliers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = suppliers.organization_id)
  );

DROP POLICY IF EXISTS "Users can insert suppliers in their org" ON suppliers;
CREATE POLICY "Users can insert suppliers in their org" ON suppliers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = suppliers.organization_id)
  );

DROP POLICY IF EXISTS "Users can update suppliers in their org" ON suppliers;
CREATE POLICY "Users can update suppliers in their org" ON suppliers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = suppliers.organization_id)
  );