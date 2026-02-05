
-- =====================================================
-- MULTI-TENANCY FOUNDATION MIGRATION
-- =====================================================

-- 1. Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Create organization_memberships table
CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Enable RLS on memberships
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to get user's organization (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_organization_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_memberships
  WHERE user_id = p_user_id
  LIMIT 1
$$;

-- 4. RLS policies for organizations table
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (id = get_user_organization_id(auth.uid()));

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (id = get_user_organization_id(auth.uid()));

-- 5. RLS policies for organization_memberships table
CREATE POLICY "Users can view memberships in their organization"
  ON public.organization_memberships FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create their own membership"
  ON public.organization_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can manage memberships"
  ON public.organization_memberships FOR UPDATE
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Owners can delete memberships"
  ON public.organization_memberships FOR DELETE
  USING (organization_id = get_user_organization_id(auth.uid()));

-- 6. Add organization_id to all data tables (nullable first for migration)
ALTER TABLE public.builders ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.locations ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.phases ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.project_statuses ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.crews ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.crew_members ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.suppliers ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.pump_vendors ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.inspection_types ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.inspectors ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.concrete_mixes ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.projects ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.schedule_entries ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.daily_notes ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.project_documents ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 7. Create ECFI organization and migrate existing data
DO $$
DECLARE
  ecfi_org_id uuid;
  ecfi_user_id uuid;
BEGIN
  -- Get the existing user
  SELECT id INTO ecfi_user_id FROM auth.users WHERE email = 'elan@easternconcrete.com' LIMIT 1;
  
  -- Create ECFI organization
  INSERT INTO public.organizations (name, invite_code, created_by)
  VALUES ('ECFI', 'ecfi2024', ecfi_user_id)
  RETURNING id INTO ecfi_org_id;
  
  -- Create owner membership
  IF ecfi_user_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships (user_id, organization_id, role)
    VALUES (ecfi_user_id, ecfi_org_id, 'owner');
  END IF;
  
  -- Migrate all existing data to ECFI organization
  UPDATE public.builders SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.locations SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.phases SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.project_statuses SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.crews SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.crew_members SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.suppliers SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.pump_vendors SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.inspection_types SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.inspectors SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.concrete_mixes SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.projects SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.schedule_entries SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.daily_notes SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
  UPDATE public.project_documents SET organization_id = ecfi_org_id WHERE organization_id IS NULL;
END $$;

-- 8. Now make organization_id NOT NULL on all tables
ALTER TABLE public.builders ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.locations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.phases ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.project_statuses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.crews ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.crew_members ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.suppliers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.pump_vendors ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.inspection_types ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.inspectors ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.concrete_mixes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.schedule_entries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.daily_notes ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.project_documents ALTER COLUMN organization_id SET NOT NULL;

-- 9. Drop old RLS policies and create new organization-scoped ones

-- BUILDERS
DROP POLICY IF EXISTS "Authenticated users can view builders" ON public.builders;
DROP POLICY IF EXISTS "Authenticated users can insert builders" ON public.builders;
DROP POLICY IF EXISTS "Authenticated users can update builders" ON public.builders;
CREATE POLICY "Users can view builders in their org" ON public.builders FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert builders in their org" ON public.builders FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update builders in their org" ON public.builders FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- LOCATIONS
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can update locations" ON public.locations;
CREATE POLICY "Users can view locations in their org" ON public.locations FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert locations in their org" ON public.locations FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update locations in their org" ON public.locations FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- PHASES
DROP POLICY IF EXISTS "Authenticated users can view phases" ON public.phases;
DROP POLICY IF EXISTS "Authenticated users can insert phases" ON public.phases;
DROP POLICY IF EXISTS "Authenticated users can update phases" ON public.phases;
CREATE POLICY "Users can view phases in their org" ON public.phases FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert phases in their org" ON public.phases FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update phases in their org" ON public.phases FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- PROJECT_STATUSES
DROP POLICY IF EXISTS "Authenticated users can view statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Authenticated users can insert statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Authenticated users can update statuses" ON public.project_statuses;
CREATE POLICY "Users can view statuses in their org" ON public.project_statuses FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert statuses in their org" ON public.project_statuses FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update statuses in their org" ON public.project_statuses FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- CREWS
DROP POLICY IF EXISTS "Authenticated users can view crews" ON public.crews;
DROP POLICY IF EXISTS "Authenticated users can insert crews" ON public.crews;
DROP POLICY IF EXISTS "Authenticated users can update crews" ON public.crews;
CREATE POLICY "Users can view crews in their org" ON public.crews FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert crews in their org" ON public.crews FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update crews in their org" ON public.crews FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- CREW_MEMBERS
DROP POLICY IF EXISTS "Authenticated users can view crew_members" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated users can insert crew_members" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated users can update crew_members" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated users can delete crew_members" ON public.crew_members;
CREATE POLICY "Users can view crew_members in their org" ON public.crew_members FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert crew_members in their org" ON public.crew_members FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update crew_members in their org" ON public.crew_members FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can delete crew_members in their org" ON public.crew_members FOR DELETE USING (organization_id = get_user_organization_id(auth.uid()));

-- SUPPLIERS
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
CREATE POLICY "Users can view suppliers in their org" ON public.suppliers FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert suppliers in their org" ON public.suppliers FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update suppliers in their org" ON public.suppliers FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- PUMP_VENDORS
DROP POLICY IF EXISTS "Authenticated users can view pump_vendors" ON public.pump_vendors;
DROP POLICY IF EXISTS "Authenticated users can insert pump_vendors" ON public.pump_vendors;
DROP POLICY IF EXISTS "Authenticated users can update pump_vendors" ON public.pump_vendors;
CREATE POLICY "Users can view pump_vendors in their org" ON public.pump_vendors FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert pump_vendors in their org" ON public.pump_vendors FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update pump_vendors in their org" ON public.pump_vendors FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- INSPECTION_TYPES
DROP POLICY IF EXISTS "Authenticated users can view inspection_types" ON public.inspection_types;
DROP POLICY IF EXISTS "Authenticated users can insert inspection_types" ON public.inspection_types;
DROP POLICY IF EXISTS "Authenticated users can update inspection_types" ON public.inspection_types;
CREATE POLICY "Users can view inspection_types in their org" ON public.inspection_types FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert inspection_types in their org" ON public.inspection_types FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update inspection_types in their org" ON public.inspection_types FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- INSPECTORS
DROP POLICY IF EXISTS "Authenticated users can view inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Authenticated users can insert inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Authenticated users can update inspectors" ON public.inspectors;
CREATE POLICY "Users can view inspectors in their org" ON public.inspectors FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert inspectors in their org" ON public.inspectors FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update inspectors in their org" ON public.inspectors FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- CONCRETE_MIXES
DROP POLICY IF EXISTS "Authenticated users can view concrete_mixes" ON public.concrete_mixes;
DROP POLICY IF EXISTS "Authenticated users can insert concrete_mixes" ON public.concrete_mixes;
DROP POLICY IF EXISTS "Authenticated users can update concrete_mixes" ON public.concrete_mixes;
CREATE POLICY "Users can view concrete_mixes in their org" ON public.concrete_mixes FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert concrete_mixes in their org" ON public.concrete_mixes FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update concrete_mixes in their org" ON public.concrete_mixes FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- PROJECTS
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;
CREATE POLICY "Users can view projects in their org" ON public.projects FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert projects in their org" ON public.projects FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update projects in their org" ON public.projects FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can delete projects in their org" ON public.projects FOR DELETE USING (organization_id = get_user_organization_id(auth.uid()));

-- SCHEDULE_ENTRIES
DROP POLICY IF EXISTS "Authenticated users can view entries" ON public.schedule_entries;
DROP POLICY IF EXISTS "Authenticated users can insert entries" ON public.schedule_entries;
DROP POLICY IF EXISTS "Authenticated users can update entries" ON public.schedule_entries;
DROP POLICY IF EXISTS "Authenticated users can delete entries" ON public.schedule_entries;
CREATE POLICY "Users can view entries in their org" ON public.schedule_entries FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert entries in their org" ON public.schedule_entries FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update entries in their org" ON public.schedule_entries FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can delete entries in their org" ON public.schedule_entries FOR DELETE USING (organization_id = get_user_organization_id(auth.uid()));

-- DAILY_NOTES
DROP POLICY IF EXISTS "Authenticated users can view daily_notes" ON public.daily_notes;
DROP POLICY IF EXISTS "Authenticated users can insert daily_notes" ON public.daily_notes;
DROP POLICY IF EXISTS "Authenticated users can update daily_notes" ON public.daily_notes;
CREATE POLICY "Users can view daily_notes in their org" ON public.daily_notes FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert daily_notes in their org" ON public.daily_notes FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update daily_notes in their org" ON public.daily_notes FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));

-- PROJECT_DOCUMENTS
DROP POLICY IF EXISTS "Authenticated users can view project_documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can insert project_documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can update project_documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can delete project_documents" ON public.project_documents;
CREATE POLICY "Users can view project_documents in their org" ON public.project_documents FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can insert project_documents in their org" ON public.project_documents FOR INSERT WITH CHECK (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can update project_documents in their org" ON public.project_documents FOR UPDATE USING (organization_id = get_user_organization_id(auth.uid()));
CREATE POLICY "Users can delete project_documents in their org" ON public.project_documents FOR DELETE USING (organization_id = get_user_organization_id(auth.uid()));

-- PROFILES (keep existing policies, no org isolation needed)

-- 10. Add indexes for performance
CREATE INDEX idx_builders_org ON public.builders(organization_id);
CREATE INDEX idx_locations_org ON public.locations(organization_id);
CREATE INDEX idx_phases_org ON public.phases(organization_id);
CREATE INDEX idx_project_statuses_org ON public.project_statuses(organization_id);
CREATE INDEX idx_crews_org ON public.crews(organization_id);
CREATE INDEX idx_crew_members_org ON public.crew_members(organization_id);
CREATE INDEX idx_suppliers_org ON public.suppliers(organization_id);
CREATE INDEX idx_pump_vendors_org ON public.pump_vendors(organization_id);
CREATE INDEX idx_inspection_types_org ON public.inspection_types(organization_id);
CREATE INDEX idx_inspectors_org ON public.inspectors(organization_id);
CREATE INDEX idx_concrete_mixes_org ON public.concrete_mixes(organization_id);
CREATE INDEX idx_projects_org ON public.projects(organization_id);
CREATE INDEX idx_schedule_entries_org ON public.schedule_entries(organization_id);
CREATE INDEX idx_daily_notes_org ON public.daily_notes(organization_id);
CREATE INDEX idx_project_documents_org ON public.project_documents(organization_id);
CREATE INDEX idx_org_memberships_user ON public.organization_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON public.organization_memberships(organization_id);

-- 11. Add trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
