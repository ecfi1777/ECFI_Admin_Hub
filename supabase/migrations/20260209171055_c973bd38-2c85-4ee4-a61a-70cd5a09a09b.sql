
-- Step 1: Add is_archived column
ALTER TABLE public.projects
ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate existing archived projects to is_archived = true, reassign to "Complete" (or highest display_order)
UPDATE public.projects p
SET is_archived = true,
    status_id = COALESCE(
      (SELECT ps_c.id FROM public.project_statuses ps_c WHERE ps_c.name = 'Complete' AND ps_c.organization_id = p.organization_id LIMIT 1),
      (SELECT ps_h.id FROM public.project_statuses ps_h WHERE ps_h.organization_id = p.organization_id AND ps_h.name != 'Archived' ORDER BY ps_h.display_order DESC LIMIT 1)
    ),
    updated_at = now()
FROM public.project_statuses ps_archived
WHERE p.status_id = ps_archived.id
  AND ps_archived.name = 'Archived'
  AND ps_archived.organization_id = p.organization_id;

-- Step 3: Delete "Archived" status rows
DELETE FROM public.project_statuses WHERE name = 'Archived';

-- Step 4: Drop auto-archive function
DROP FUNCTION IF EXISTS public.auto_archive_completed_projects();

-- Step 5: Unschedule cron job (safe if not exists)
DO $$
BEGIN
  PERFORM cron.unschedule('auto-archive-completed-projects');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Step 6: Update seed function (remove "Archived" status)
CREATE OR REPLACE FUNCTION public.seed_organization_defaults(p_organization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify caller owns this organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = p_organization_id
      AND role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO phases (organization_id, name, display_order) VALUES
    (p_organization_id, 'Footings', 1),
    (p_organization_id, 'Walls', 2),
    (p_organization_id, 'Flatwork', 3),
    (p_organization_id, 'Garage', 4),
    (p_organization_id, 'Porch', 5);

  INSERT INTO project_statuses (organization_id, name, display_order) VALUES
    (p_organization_id, 'Upcoming', 1),
    (p_organization_id, 'Ready to Start', 2),
    (p_organization_id, 'In Progress', 3),
    (p_organization_id, 'Complete', 4);

  INSERT INTO crews (organization_id, name, display_order) VALUES
    (p_organization_id, 'Crew 1', 1),
    (p_organization_id, 'Crew 2', 2);

  INSERT INTO concrete_mixes (organization_id, name, display_order) VALUES
    (p_organization_id, '3500 PSI', 1),
    (p_organization_id, '4000 PSI', 2);
END;
$function$;

-- Step 7: Create index
CREATE INDEX idx_projects_is_archived ON public.projects (organization_id, is_archived);
