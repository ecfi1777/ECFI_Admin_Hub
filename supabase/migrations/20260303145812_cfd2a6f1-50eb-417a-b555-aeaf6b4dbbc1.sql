
-- Add google_drive_folder_id to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT DEFAULT NULL;

-- Add Drive columns to project_documents
ALTER TABLE public.project_documents
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drive_file_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS storage_type TEXT NOT NULL DEFAULT 'supabase';

-- Validation trigger for storage_type instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_storage_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.storage_type NOT IN ('supabase', 'google_drive') THEN
    RAISE EXCEPTION 'storage_type must be supabase or google_drive';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_project_documents_storage_type
  BEFORE INSERT OR UPDATE ON public.project_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_storage_type();

-- Create project_drive_folders table
CREATE TABLE IF NOT EXISTS public.project_drive_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  drive_folder_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, category)
);

ALTER TABLE public.project_drive_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org drive folders"
  ON public.project_drive_folders
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = project_drive_folders.organization_id
  ));

CREATE POLICY "Users can insert own org drive folders"
  ON public.project_drive_folders
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = project_drive_folders.organization_id
  ));

CREATE POLICY "Users can delete own org drive folders"
  ON public.project_drive_folders
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = project_drive_folders.organization_id
  ));
