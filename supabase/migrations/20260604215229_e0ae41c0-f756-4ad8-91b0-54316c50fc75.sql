CREATE TABLE public.project_materials_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  pl_section text NOT NULL,
  description text NOT NULL,
  vendor text,
  amount numeric NOT NULL DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_materials_costs TO authenticated;
GRANT ALL ON public.project_materials_costs TO service_role;

ALTER TABLE public.project_materials_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view project_materials_costs"
  ON public.project_materials_costs FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = project_materials_costs.organization_id));

CREATE POLICY "org members can insert project_materials_costs"
  ON public.project_materials_costs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = project_materials_costs.organization_id));

CREATE POLICY "org members can update project_materials_costs"
  ON public.project_materials_costs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = project_materials_costs.organization_id));

CREATE POLICY "org members can delete project_materials_costs"
  ON public.project_materials_costs FOR DELETE
  USING (EXISTS (SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = project_materials_costs.organization_id));

CREATE TRIGGER validate_materials_pl_section
  BEFORE INSERT OR UPDATE ON public.project_materials_costs
  FOR EACH ROW EXECUTE FUNCTION public.validate_pl_section_two();

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.project_materials_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();