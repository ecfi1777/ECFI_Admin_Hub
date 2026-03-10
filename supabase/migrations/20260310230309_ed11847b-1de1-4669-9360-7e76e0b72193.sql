
-- 1. Split revenue into base_house + extras
ALTER TABLE project_pl_revenue
  ADD COLUMN IF NOT EXISTS base_house numeric(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extras numeric(12,2) DEFAULT NULL;

-- Migrate existing sales_price into base_house
UPDATE project_pl_revenue
  SET base_house = sales_price
  WHERE sales_price IS NOT NULL AND base_house IS NULL;

-- 2. Add phase_type to phases table
ALTER TABLE phases
  ADD COLUMN IF NOT EXISTS phase_type text DEFAULT NULL;

-- Validation trigger for phase_type
CREATE OR REPLACE FUNCTION public.validate_phase_type()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.phase_type IS NOT NULL AND NEW.phase_type NOT IN ('footing', 'wall', 'slab', 'other') THEN
    RAISE EXCEPTION 'phase_type must be footing, wall, slab, or other';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_phase_type
  BEFORE INSERT OR UPDATE ON phases
  FOR EACH ROW EXECUTE FUNCTION validate_phase_type();

-- 3. Commission table
CREATE TABLE IF NOT EXISTS project_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  calc_method text NOT NULL DEFAULT 'per_cy',
  rate_per_cy numeric(8,2) DEFAULT NULL,
  pct_of_invoice numeric(5,2) DEFAULT NULL,
  override_amount numeric(12,2) DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, crew_id)
);

-- Validation trigger for calc_method
CREATE OR REPLACE FUNCTION public.validate_calc_method()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.calc_method NOT IN ('per_cy', 'pct_invoice') THEN
    RAISE EXCEPTION 'calc_method must be per_cy or pct_invoice';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_calc_method
  BEFORE INSERT OR UPDATE ON project_commissions
  FOR EACH ROW EXECUTE FUNCTION validate_calc_method();

ALTER TABLE project_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view project_commissions"
  ON project_commissions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_memberships.user_id = auth.uid()
    AND organization_memberships.organization_id = project_commissions.organization_id
  ));

CREATE POLICY "org members can insert project_commissions"
  ON project_commissions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_memberships.user_id = auth.uid()
    AND organization_memberships.organization_id = project_commissions.organization_id
  ));

CREATE POLICY "org members can update project_commissions"
  ON project_commissions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_memberships.user_id = auth.uid()
    AND organization_memberships.organization_id = project_commissions.organization_id
  ));

CREATE POLICY "org members can delete project_commissions"
  ON project_commissions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_memberships.user_id = auth.uid()
    AND organization_memberships.organization_id = project_commissions.organization_id
  ));
