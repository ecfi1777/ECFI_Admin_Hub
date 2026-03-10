
-- 1. Tag phases with a P&L section
ALTER TABLE phases 
ADD COLUMN IF NOT EXISTS pl_section text;

-- 2. Store revenue targets per project per section
CREATE TABLE IF NOT EXISTS project_pl_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section text NOT NULL,
  sales_price numeric(12,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id, section)
);

-- 3. Employees per crew with saved rates
CREATE TABLE IF NOT EXISTS crew_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  name text NOT NULL,
  hourly_rate numeric(8,2),
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Labor entries per project per day
CREATE TABLE IF NOT EXISTS project_labor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  crew_id uuid REFERENCES crews(id),
  entry_date date NOT NULL,
  pl_section text NOT NULL,
  entry_mode text NOT NULL,
  total_hours numeric(6,2),
  total_rate numeric(8,2),
  total_cost numeric(12,2) GENERATED ALWAYS AS (total_hours * total_rate) STORED,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Individual employee lines within a labor entry
CREATE TABLE IF NOT EXISTS project_labor_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_entry_id uuid NOT NULL REFERENCES project_labor_entries(id) ON DELETE CASCADE,
  crew_employee_id uuid REFERENCES crew_employees(id) ON DELETE SET NULL,
  employee_name text NOT NULL,
  hours numeric(6,2) NOT NULL DEFAULT 0,
  hourly_rate numeric(8,2) NOT NULL DEFAULT 0,
  line_cost numeric(12,2) GENERATED ALWAYS AS (hours * hourly_rate) STORED,
  created_at timestamptz DEFAULT now()
);

-- 6. Free-form additional cost line items per project per section
CREATE TABLE IF NOT EXISTS project_other_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pl_section text NOT NULL,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION validate_pl_section()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pl_section IS NOT NULL AND NEW.pl_section NOT IN ('footings_walls', 'slab', 'both', 'overhead') THEN
    RAISE EXCEPTION 'pl_section must be footings_walls, slab, both, or overhead';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_phases_pl_section
BEFORE INSERT OR UPDATE ON phases
FOR EACH ROW EXECUTE FUNCTION validate_pl_section();

CREATE OR REPLACE FUNCTION validate_pl_section_two()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pl_section NOT IN ('footings_walls', 'slab') THEN
    RAISE EXCEPTION 'pl_section must be footings_walls or slab';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_labor_entries_pl_section
BEFORE INSERT OR UPDATE ON project_labor_entries
FOR EACH ROW EXECUTE FUNCTION validate_pl_section_two();

CREATE TRIGGER trg_validate_other_costs_pl_section
BEFORE INSERT OR UPDATE ON project_other_costs
FOR EACH ROW EXECUTE FUNCTION validate_pl_section_two();

CREATE OR REPLACE FUNCTION validate_revenue_section()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.section NOT IN ('footings_walls', 'slab') THEN
    RAISE EXCEPTION 'section must be footings_walls or slab';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_revenue_section
BEFORE INSERT OR UPDATE ON project_pl_revenue
FOR EACH ROW EXECUTE FUNCTION validate_revenue_section();

CREATE OR REPLACE FUNCTION validate_entry_mode()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.entry_mode NOT IN ('by_employee', 'crew_total') THEN
    RAISE EXCEPTION 'entry_mode must be by_employee or crew_total';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_entry_mode
BEFORE INSERT OR UPDATE ON project_labor_entries
FOR EACH ROW EXECUTE FUNCTION validate_entry_mode();

-- 8. RLS
ALTER TABLE project_pl_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_labor_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_other_costs ENABLE ROW LEVEL SECURITY;

-- project_pl_revenue: separate policies per command
CREATE POLICY "org members can view project_pl_revenue"
  ON project_pl_revenue FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_pl_revenue.organization_id
  ));
CREATE POLICY "org members can insert project_pl_revenue"
  ON project_pl_revenue FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_pl_revenue.organization_id
  ));
CREATE POLICY "org members can update project_pl_revenue"
  ON project_pl_revenue FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_pl_revenue.organization_id
  ));
CREATE POLICY "org members can delete project_pl_revenue"
  ON project_pl_revenue FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_pl_revenue.organization_id
  ));

-- crew_employees
CREATE POLICY "org members can view crew_employees"
  ON crew_employees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_employees.organization_id
  ));
CREATE POLICY "org members can insert crew_employees"
  ON crew_employees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_employees.organization_id
  ));
CREATE POLICY "org members can update crew_employees"
  ON crew_employees FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_employees.organization_id
  ));
CREATE POLICY "org members can delete crew_employees"
  ON crew_employees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = crew_employees.organization_id
  ));

-- project_labor_entries
CREATE POLICY "org members can view project_labor_entries"
  ON project_labor_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_labor_entries.organization_id
  ));
CREATE POLICY "org members can insert project_labor_entries"
  ON project_labor_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_labor_entries.organization_id
  ));
CREATE POLICY "org members can update project_labor_entries"
  ON project_labor_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_labor_entries.organization_id
  ));
CREATE POLICY "org members can delete project_labor_entries"
  ON project_labor_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_labor_entries.organization_id
  ));

-- project_labor_employees (join through labor_entry)
CREATE POLICY "org members can view project_labor_employees"
  ON project_labor_employees FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM project_labor_entries ple
    JOIN organization_memberships om ON om.organization_id = ple.organization_id
    WHERE ple.id = project_labor_employees.labor_entry_id AND om.user_id = auth.uid()
  ));
CREATE POLICY "org members can insert project_labor_employees"
  ON project_labor_employees FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM project_labor_entries ple
    JOIN organization_memberships om ON om.organization_id = ple.organization_id
    WHERE ple.id = project_labor_employees.labor_entry_id AND om.user_id = auth.uid()
  ));
CREATE POLICY "org members can update project_labor_employees"
  ON project_labor_employees FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM project_labor_entries ple
    JOIN organization_memberships om ON om.organization_id = ple.organization_id
    WHERE ple.id = project_labor_employees.labor_entry_id AND om.user_id = auth.uid()
  ));
CREATE POLICY "org members can delete project_labor_employees"
  ON project_labor_employees FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM project_labor_entries ple
    JOIN organization_memberships om ON om.organization_id = ple.organization_id
    WHERE ple.id = project_labor_employees.labor_entry_id AND om.user_id = auth.uid()
  ));

-- project_other_costs
CREATE POLICY "org members can view project_other_costs"
  ON project_other_costs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_other_costs.organization_id
  ));
CREATE POLICY "org members can insert project_other_costs"
  ON project_other_costs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_other_costs.organization_id
  ));
CREATE POLICY "org members can update project_other_costs"
  ON project_other_costs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_other_costs.organization_id
  ));
CREATE POLICY "org members can delete project_other_costs"
  ON project_other_costs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = project_other_costs.organization_id
  ));
