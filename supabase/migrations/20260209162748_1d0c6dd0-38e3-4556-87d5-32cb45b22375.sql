
ALTER TABLE public.organization_memberships 
ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
