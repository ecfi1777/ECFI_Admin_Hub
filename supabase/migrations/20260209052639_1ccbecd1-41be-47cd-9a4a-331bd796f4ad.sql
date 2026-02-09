-- Drop the old constraint first (allows 'manager' and 'viewer' values)
ALTER TABLE public.organization_memberships
DROP CONSTRAINT IF EXISTS organization_memberships_role_check;

-- Also drop in case it was named differently
ALTER TABLE public.organization_memberships
DROP CONSTRAINT IF EXISTS valid_role;

-- Update existing 'member' rows to 'manager'
UPDATE public.organization_memberships SET role = 'manager' WHERE role = 'member';

-- Add new constraint with all three valid roles
ALTER TABLE public.organization_memberships
ADD CONSTRAINT organization_memberships_role_check
CHECK (role IN ('owner', 'manager', 'viewer'));

-- Update default to 'viewer'
ALTER TABLE public.organization_memberships
ALTER COLUMN role SET DEFAULT 'viewer';