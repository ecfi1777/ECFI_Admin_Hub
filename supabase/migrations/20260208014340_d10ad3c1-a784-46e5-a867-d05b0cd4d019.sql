
-- Fix: Drop incorrect unique constraint on name alone, replace with per-org unique
ALTER TABLE public.project_statuses DROP CONSTRAINT project_statuses_name_key;
ALTER TABLE public.project_statuses ADD CONSTRAINT project_statuses_org_name_unique UNIQUE (organization_id, name);

-- 1. Add status_changed_at column to projects
ALTER TABLE public.projects 
ADD COLUMN status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Backfill existing projects with updated_at as a reasonable default
UPDATE public.projects SET status_changed_at = updated_at;

-- 2. Create trigger to auto-update status_changed_at when status_id changes
CREATE OR REPLACE FUNCTION public.update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status_id IS DISTINCT FROM NEW.status_id THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_projects_status_changed_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_status_changed_at();

-- 3. Update existing statuses for all organizations
UPDATE public.project_statuses SET name = 'Upcoming', display_order = 1 WHERE name = 'Pending';
UPDATE public.project_statuses SET name = 'Archived', display_order = 5 WHERE name = 'On Hold';

-- Insert missing statuses for each organization that doesn't have them
INSERT INTO public.project_statuses (organization_id, name, display_order)
SELECT o.id, s.name, s.display_order
FROM public.organizations o
CROSS JOIN (
  VALUES ('Upcoming', 1), ('Ready to Start', 2), ('In Progress', 3), ('Complete', 4), ('Archived', 5)
) AS s(name, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_statuses ps 
  WHERE ps.organization_id = o.id AND ps.name = s.name
);

-- 4. Update seed function for new organizations
CREATE OR REPLACE FUNCTION public.seed_organization_defaults(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
    (p_organization_id, 'Complete', 4),
    (p_organization_id, 'Archived', 5);

  INSERT INTO crews (organization_id, name, display_order) VALUES
    (p_organization_id, 'Crew 1', 1),
    (p_organization_id, 'Crew 2', 2);

  INSERT INTO concrete_mixes (organization_id, name, display_order) VALUES
    (p_organization_id, '3500 PSI', 1),
    (p_organization_id, '4000 PSI', 2);
END;
$function$;

-- 5. Create auto-archive function
CREATE OR REPLACE FUNCTION public.auto_archive_completed_projects()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.projects p
  SET status_id = ps_archived.id,
      status_changed_at = now()
  FROM public.project_statuses ps_complete,
       public.project_statuses ps_archived
  WHERE p.status_id = ps_complete.id
    AND ps_complete.name = 'Complete'
    AND ps_complete.organization_id = p.organization_id
    AND ps_archived.name = 'Archived'
    AND ps_archived.organization_id = p.organization_id
    AND p.status_changed_at < now() - INTERVAL '30 days';
END;
$function$;
