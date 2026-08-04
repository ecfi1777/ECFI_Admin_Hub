CREATE TABLE public.invoice_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  builder_name text NOT NULL,
  location_name text,
  lot_number text,
  description text NOT NULL,
  amount numeric,
  invoice_number text,
  invoice_complete boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_extras TO authenticated;
GRANT ALL ON public.invoice_extras TO service_role;

ALTER TABLE public.invoice_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view invoice extras"
ON public.invoice_extras FOR SELECT TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can insert invoice extras"
ON public.invoice_extras FOR INSERT TO authenticated
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can update invoice extras"
ON public.invoice_extras FOR UPDATE TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id))
WITH CHECK (public.user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can delete invoice extras"
ON public.invoice_extras FOR DELETE TO authenticated
USING (public.user_has_manage_access(auth.uid(), organization_id));

CREATE TRIGGER update_invoice_extras_updated_at
BEFORE UPDATE ON public.invoice_extras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_invoice_extras_org_complete ON public.invoice_extras (organization_id, invoice_complete, entry_date DESC);