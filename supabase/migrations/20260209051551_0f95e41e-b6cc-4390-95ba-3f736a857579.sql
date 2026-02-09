-- Harden seed_organization_defaults: add ownership verification + restrict execution

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

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION public.seed_organization_defaults(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_organization_defaults(uuid) TO authenticated;