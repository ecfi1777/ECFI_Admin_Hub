
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
