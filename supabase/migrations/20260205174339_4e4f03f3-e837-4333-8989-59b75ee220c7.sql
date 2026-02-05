-- Create a function to seed default reference data for new organizations
CREATE OR REPLACE FUNCTION public.seed_organization_defaults(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seed default phases
  INSERT INTO phases (organization_id, name, display_order) VALUES
    (p_organization_id, 'Footings', 1),
    (p_organization_id, 'Walls', 2),
    (p_organization_id, 'Flatwork', 3),
    (p_organization_id, 'Garage', 4),
    (p_organization_id, 'Porch', 5);

  -- Seed default project statuses
  INSERT INTO project_statuses (organization_id, name, display_order) VALUES
    (p_organization_id, 'Pending', 1),
    (p_organization_id, 'In Progress', 2),
    (p_organization_id, 'Complete', 3),
    (p_organization_id, 'On Hold', 4);

  -- Seed default crews
  INSERT INTO crews (organization_id, name, display_order) VALUES
    (p_organization_id, 'Crew 1', 1),
    (p_organization_id, 'Crew 2', 2);

  -- Seed default concrete mixes
  INSERT INTO concrete_mixes (organization_id, name, display_order) VALUES
    (p_organization_id, '3500 PSI', 1),
    (p_organization_id, '4000 PSI', 2);
END;
$$;

-- Create a function to generate a unique invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM organizations WHERE invite_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Add a policy to allow reading organizations by invite code (for joining)
CREATE POLICY "Users can view organizations by invite code"
ON public.organizations
FOR SELECT
USING (true);

-- Drop the existing restrictive policy and recreate as permissive for viewing org by invite code
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;

-- Recreate the policy - users can view their own org OR any org (for invite code lookup)
-- But we want to be careful - let's allow all authenticated users to SELECT (for invite code validation)
-- The actual sensitive data access is controlled at the membership level