
-- =============================================================
-- Fix project-documents storage bucket RLS policies
-- Scope access to the project's organization via projects + organization_memberships
-- Object key format: {project_id}/...
-- =============================================================

-- Drop old permissive policies (common names from initial setup)
DROP POLICY IF EXISTS "Authenticated users can view project documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update project documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete project documents" ON storage.objects;

-- Drop any prior org-scoped policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view project documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload project documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can update project documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project documents in their org" ON storage.objects;

-- 1) SELECT: allow if user is a member of the project's org
CREATE POLICY "Users can view project documents in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_memberships om
      ON om.organization_id = p.organization_id
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND om.user_id = auth.uid()
  )
);

-- 2) INSERT: allow if user is a member of the project's org
CREATE POLICY "Users can upload project documents in their org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_memberships om
      ON om.organization_id = p.organization_id
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND om.user_id = auth.uid()
  )
);

-- 3) UPDATE: uploader OR org owner, AND must be in the project's org
CREATE POLICY "Users can update project documents in their org"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_memberships om
      ON om.organization_id = p.organization_id
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND om.user_id = auth.uid()
  )
  AND (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.organization_memberships om
        ON om.organization_id = p.organization_id
      WHERE p.id = ((storage.foldername(name))[1])::uuid
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  )
)
WITH CHECK (
  bucket_id = 'project-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_memberships om
      ON om.organization_id = p.organization_id
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND om.user_id = auth.uid()
  )
  AND (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.organization_memberships om
        ON om.organization_id = p.organization_id
      WHERE p.id = ((storage.foldername(name))[1])::uuid
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  )
);

-- 4) DELETE: uploader OR org owner, AND must be in the project's org
CREATE POLICY "Users can delete project documents in their org"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-documents'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.organization_memberships om
      ON om.organization_id = p.organization_id
    WHERE p.id = ((storage.foldername(name))[1])::uuid
      AND om.user_id = auth.uid()
  )
  AND (
    owner = auth.uid()
    OR owner_id = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.organization_memberships om
        ON om.organization_id = p.organization_id
      WHERE p.id = ((storage.foldername(name))[1])::uuid
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  )
);
