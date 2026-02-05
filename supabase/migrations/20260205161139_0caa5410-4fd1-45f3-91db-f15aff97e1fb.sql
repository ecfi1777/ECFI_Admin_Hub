-- Fix all RLS policies to require authentication
-- Drop existing policies and recreate with auth.role() = 'authenticated' check

-- ==================== BUILDERS ====================
DROP POLICY IF EXISTS "Authenticated users can view builders" ON public.builders;
DROP POLICY IF EXISTS "Authenticated users can insert builders" ON public.builders;
DROP POLICY IF EXISTS "Authenticated users can update builders" ON public.builders;

CREATE POLICY "Authenticated users can view builders" ON public.builders
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert builders" ON public.builders
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update builders" ON public.builders
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== CONCRETE_MIXES ====================
DROP POLICY IF EXISTS "Authenticated users can view concrete_mixes" ON public.concrete_mixes;
DROP POLICY IF EXISTS "Authenticated users can insert concrete_mixes" ON public.concrete_mixes;
DROP POLICY IF EXISTS "Authenticated users can update concrete_mixes" ON public.concrete_mixes;

CREATE POLICY "Authenticated users can view concrete_mixes" ON public.concrete_mixes
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert concrete_mixes" ON public.concrete_mixes
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update concrete_mixes" ON public.concrete_mixes
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== CREW_MEMBERS ====================
DROP POLICY IF EXISTS "Authenticated users can view crew_members" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated users can insert crew_members" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated users can update crew_members" ON public.crew_members;
DROP POLICY IF EXISTS "Authenticated users can delete crew_members" ON public.crew_members;

CREATE POLICY "Authenticated users can view crew_members" ON public.crew_members
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert crew_members" ON public.crew_members
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update crew_members" ON public.crew_members
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete crew_members" ON public.crew_members
FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== CREWS ====================
DROP POLICY IF EXISTS "Authenticated users can view crews" ON public.crews;
DROP POLICY IF EXISTS "Authenticated users can insert crews" ON public.crews;
DROP POLICY IF EXISTS "Authenticated users can update crews" ON public.crews;

CREATE POLICY "Authenticated users can view crews" ON public.crews
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert crews" ON public.crews
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update crews" ON public.crews
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== DAILY_NOTES ====================
DROP POLICY IF EXISTS "Authenticated users can view daily_notes" ON public.daily_notes;
DROP POLICY IF EXISTS "Authenticated users can insert daily_notes" ON public.daily_notes;
DROP POLICY IF EXISTS "Authenticated users can update daily_notes" ON public.daily_notes;

CREATE POLICY "Authenticated users can view daily_notes" ON public.daily_notes
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert daily_notes" ON public.daily_notes
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update daily_notes" ON public.daily_notes
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== INSPECTION_TYPES ====================
DROP POLICY IF EXISTS "Authenticated users can view inspection_types" ON public.inspection_types;
DROP POLICY IF EXISTS "Authenticated users can insert inspection_types" ON public.inspection_types;
DROP POLICY IF EXISTS "Authenticated users can update inspection_types" ON public.inspection_types;

CREATE POLICY "Authenticated users can view inspection_types" ON public.inspection_types
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert inspection_types" ON public.inspection_types
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inspection_types" ON public.inspection_types
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== INSPECTORS ====================
DROP POLICY IF EXISTS "Authenticated users can view inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Authenticated users can insert inspectors" ON public.inspectors;
DROP POLICY IF EXISTS "Authenticated users can update inspectors" ON public.inspectors;

CREATE POLICY "Authenticated users can view inspectors" ON public.inspectors
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert inspectors" ON public.inspectors
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update inspectors" ON public.inspectors
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== LOCATIONS ====================
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Authenticated users can update locations" ON public.locations;

CREATE POLICY "Authenticated users can view locations" ON public.locations
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert locations" ON public.locations
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update locations" ON public.locations
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== PHASES ====================
DROP POLICY IF EXISTS "Authenticated users can view phases" ON public.phases;
DROP POLICY IF EXISTS "Authenticated users can insert phases" ON public.phases;
DROP POLICY IF EXISTS "Authenticated users can update phases" ON public.phases;

CREATE POLICY "Authenticated users can view phases" ON public.phases
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert phases" ON public.phases
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update phases" ON public.phases
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

-- ==================== PROJECT_DOCUMENTS ====================
DROP POLICY IF EXISTS "Authenticated users can view project_documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can insert project_documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can update project_documents" ON public.project_documents;
DROP POLICY IF EXISTS "Authenticated users can delete project_documents" ON public.project_documents;

CREATE POLICY "Authenticated users can view project_documents" ON public.project_documents
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert project_documents" ON public.project_documents
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project_documents" ON public.project_documents
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project_documents" ON public.project_documents
FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== PROJECT_STATUSES ====================
DROP POLICY IF EXISTS "Authenticated users can view statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Authenticated users can insert statuses" ON public.project_statuses;
DROP POLICY IF EXISTS "Authenticated users can update statuses" ON public.project_statuses;

CREATE POLICY "Authenticated users can view statuses" ON public.project_statuses
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert statuses" ON public.project_statuses
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update statuses" ON public.project_statuses
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== PROJECTS ====================
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON public.projects;

CREATE POLICY "Authenticated users can view projects" ON public.projects
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert projects" ON public.projects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projects" ON public.projects
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projects" ON public.projects
FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== PUMP_VENDORS ====================
DROP POLICY IF EXISTS "Authenticated users can view pump_vendors" ON public.pump_vendors;
DROP POLICY IF EXISTS "Authenticated users can insert pump_vendors" ON public.pump_vendors;
DROP POLICY IF EXISTS "Authenticated users can update pump_vendors" ON public.pump_vendors;

CREATE POLICY "Authenticated users can view pump_vendors" ON public.pump_vendors
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert pump_vendors" ON public.pump_vendors
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pump_vendors" ON public.pump_vendors
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== SCHEDULE_ENTRIES ====================
DROP POLICY IF EXISTS "Authenticated users can view entries" ON public.schedule_entries;
DROP POLICY IF EXISTS "Authenticated users can insert entries" ON public.schedule_entries;
DROP POLICY IF EXISTS "Authenticated users can update entries" ON public.schedule_entries;
DROP POLICY IF EXISTS "Authenticated users can delete entries" ON public.schedule_entries;

CREATE POLICY "Authenticated users can view entries" ON public.schedule_entries
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert entries" ON public.schedule_entries
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update entries" ON public.schedule_entries
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete entries" ON public.schedule_entries
FOR DELETE USING (auth.role() = 'authenticated');

-- ==================== SUPPLIERS ====================
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;

CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers
FOR UPDATE USING (auth.role() = 'authenticated');

-- ==================== STORAGE POLICIES ====================
-- Update storage policies to require authentication properly
DROP POLICY IF EXISTS "Authenticated users can view project documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update project documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project documents" ON storage.objects;

CREATE POLICY "Authenticated users can view project documents" ON storage.objects
FOR SELECT USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload project documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project documents" ON storage.objects
FOR UPDATE USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project documents" ON storage.objects
FOR DELETE USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');