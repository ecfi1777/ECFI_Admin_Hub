
-- ============================================================
-- PHASE 1: Create helper function + schedule_entry_financials
-- ============================================================

-- 1. Helper function: user_has_manage_access (owner or manager)
CREATE OR REPLACE FUNCTION public.user_has_manage_access(p_user_id uuid, p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND role IN ('owner', 'manager')
  )
$$;

-- 2. Create financials table (no organization_id — derived via join)
CREATE TABLE IF NOT EXISTS public.schedule_entry_financials (
  schedule_entry_id uuid PRIMARY KEY REFERENCES public.schedule_entries(id) ON DELETE CASCADE,
  ready_mix_invoice_number text,
  ready_mix_invoice_amount numeric DEFAULT 0,
  ready_mix_yards_billed numeric DEFAULT 0,
  pump_invoice_number text,
  pump_invoice_amount numeric DEFAULT 0,
  inspection_invoice_number text,
  inspection_amount numeric DEFAULT 0,
  to_be_invoiced boolean NOT NULL DEFAULT false,
  invoice_complete boolean NOT NULL DEFAULT false,
  invoice_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.schedule_entry_financials ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies — manager+ only, org derived via schedule_entries join
CREATE POLICY "Manager+ can view financials"
  ON public.schedule_entry_financials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_entries se
      WHERE se.id = schedule_entry_financials.schedule_entry_id
        AND public.user_has_manage_access(auth.uid(), se.organization_id)
    )
  );

CREATE POLICY "Manager+ can insert financials"
  ON public.schedule_entry_financials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schedule_entries se
      WHERE se.id = schedule_entry_financials.schedule_entry_id
        AND public.user_has_manage_access(auth.uid(), se.organization_id)
    )
  );

CREATE POLICY "Manager+ can update financials"
  ON public.schedule_entry_financials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_entries se
      WHERE se.id = schedule_entry_financials.schedule_entry_id
        AND public.user_has_manage_access(auth.uid(), se.organization_id)
    )
  );

CREATE POLICY "Manager+ can delete financials"
  ON public.schedule_entry_financials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_entries se
      WHERE se.id = schedule_entry_financials.schedule_entry_id
        AND public.user_has_manage_access(auth.uid(), se.organization_id)
    )
  );

-- 5. Backfill from schedule_entries
INSERT INTO public.schedule_entry_financials (
  schedule_entry_id,
  ready_mix_invoice_number, ready_mix_invoice_amount, ready_mix_yards_billed,
  pump_invoice_number, pump_invoice_amount,
  inspection_invoice_number, inspection_amount,
  to_be_invoiced, invoice_complete, invoice_number
)
SELECT
  id,
  ready_mix_invoice_number,
  COALESCE(ready_mix_invoice_amount, 0),
  COALESCE(ready_mix_yards_billed, 0),
  pump_invoice_number,
  COALESCE(pump_invoice_amount, 0),
  inspection_invoice_number,
  COALESCE(inspection_amount, 0),
  COALESCE(to_be_invoiced, false),
  COALESCE(invoice_complete, false),
  invoice_number
FROM public.schedule_entries
ON CONFLICT (schedule_entry_id) DO NOTHING;

-- 6. updated_at trigger
CREATE TRIGGER update_schedule_entry_financials_updated_at
  BEFORE UPDATE ON public.schedule_entry_financials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
