CREATE TABLE public.commission_payroll_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  month integer NOT NULL,
  year integer NOT NULL,
  quickbooks_amount numeric,
  payroll_used_amount numeric,
  adjustment_notes text,
  amount_paid numeric,
  labor_allowance_snapshot numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, crew_id, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payroll_reconciliations TO authenticated;
GRANT ALL ON public.commission_payroll_reconciliations TO service_role;
ALTER TABLE public.commission_payroll_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage payroll reconciliations" ON public.commission_payroll_reconciliations
  FOR ALL TO authenticated
  USING (public.user_has_manage_access(auth.uid(), organization_id))
  WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));
CREATE TRIGGER update_cpr_updated_at BEFORE UPDATE ON public.commission_payroll_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();