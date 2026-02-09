
-- Backfill: set all NULL status_id projects to "Upcoming" for their org
UPDATE public.projects p
SET status_id = ps.id,
    updated_at = now()
FROM public.project_statuses ps
WHERE p.status_id IS NULL
  AND ps.name = 'Upcoming'
  AND ps.organization_id = p.organization_id;

-- Add NOT NULL constraint
ALTER TABLE public.projects
ALTER COLUMN status_id SET NOT NULL;
