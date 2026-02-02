-- Add new fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS full_address text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS permit_number text,
ADD COLUMN IF NOT EXISTS authorization_numbers text,
ADD COLUMN IF NOT EXISTS wall_height text,
ADD COLUMN IF NOT EXISTS basement_type text,
ADD COLUMN IF NOT EXISTS google_drive_url text;

-- Create project_documents table for file attachments
CREATE TABLE public.project_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category text NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  content_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Enable RLS on project_documents
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_documents
CREATE POLICY "Authenticated users can view project_documents"
ON public.project_documents FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert project_documents"
ON public.project_documents FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_documents"
ON public.project_documents FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete project_documents"
ON public.project_documents FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_project_documents_updated_at
BEFORE UPDATE ON public.project_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-documents bucket
CREATE POLICY "Authenticated users can view project documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update project documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete project documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');