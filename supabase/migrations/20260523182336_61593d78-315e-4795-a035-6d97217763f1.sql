CREATE TABLE public.schedule_entry_stone_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_entry_id uuid NOT NULL REFERENCES public.schedule_entries(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  supplier_id uuid,
  stone_type_id uuid,
  qty_ordered text,
  order_number text,
  invoice_number text,
  invoice_amount numeric DEFAULT 0,
  tons_billed numeric DEFAULT 0,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stone_lines_entry ON public.schedule_entry_stone_lines(schedule_entry_id);
CREATE INDEX idx_stone_lines_org ON public.schedule_entry_stone_lines(organization_id);

ALTER TABLE public.schedule_entry_stone_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stone_lines in their org"
  ON public.schedule_entry_stone_lines FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE user_id = auth.uid() AND organization_id = schedule_entry_stone_lines.organization_id
  ));

CREATE POLICY "Managers can insert stone_lines in their org"
  ON public.schedule_entry_stone_lines FOR INSERT
  WITH CHECK (user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can update stone_lines in their org"
  ON public.schedule_entry_stone_lines FOR UPDATE
  USING (user_has_manage_access(auth.uid(), organization_id));

CREATE POLICY "Managers can delete stone_lines in their org"
  ON public.schedule_entry_stone_lines FOR DELETE
  USING (user_has_manage_access(auth.uid(), organization_id));

CREATE TRIGGER update_stone_lines_updated_at
  BEFORE UPDATE ON public.schedule_entry_stone_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill BEFORE attaching audit trigger
INSERT INTO public.schedule_entry_stone_lines (
  schedule_entry_id, organization_id, supplier_id, stone_type_id,
  qty_ordered, order_number, invoice_number, invoice_amount, tons_billed, notes, display_order
)
SELECT
  se.id, se.organization_id, se.stone_supplier_id, se.stone_type_id,
  CASE WHEN p.name ILIKE '%prep slab%' THEN se.qty_ordered ELSE NULL END,
  CASE WHEN p.name ILIKE '%prep slab%' THEN se.order_number ELSE NULL END,
  se.stone_invoice_number,
  coalesce(se.stone_invoice_amount, 0),
  coalesce(se.stone_tons_billed, 0),
  se.stone_notes,
  0
FROM public.schedule_entries se
LEFT JOIN public.phases p ON p.id = se.phase_id
WHERE se.stone_supplier_id IS NOT NULL
   OR se.stone_type_id IS NOT NULL
   OR se.stone_invoice_number IS NOT NULL
   OR coalesce(se.stone_invoice_amount, 0) <> 0
   OR coalesce(se.stone_tons_billed, 0) <> 0
   OR se.stone_notes IS NOT NULL;

-- Audit trigger (skips when no authenticated user, e.g. data migrations)
CREATE OR REPLACE FUNCTION public.audit_stone_lines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_record schedule_entry_stone_lines;
  v_label text;
  v_email text;
  v_supplier_code text;
  v_old_data jsonb := NULL;
  v_new_data jsonb := NULL;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_action := 'deleted'; v_record := OLD; v_old_data := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'created'; v_record := NEW; v_new_data := to_jsonb(NEW);
  ELSE
    v_action := 'updated'; v_record := NEW;
    v_old_data := to_jsonb(OLD); v_new_data := to_jsonb(NEW);
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT coalesce(code, name) INTO v_supplier_code FROM stone_suppliers WHERE id = v_record.supplier_id;

  v_label := concat_ws(' — ', 'stone line', nullif(v_supplier_code, ''));

  INSERT INTO audit_log (
    organization_id, user_id, user_email,
    table_name, record_id, action, record_label,
    old_data, new_data
  ) VALUES (
    v_record.organization_id, v_uid,
    coalesce(v_email, 'unknown'),
    'schedule_entry_stone_lines', v_record.id, v_action, v_label,
    v_old_data, v_new_data
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER audit_stone_lines_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.schedule_entry_stone_lines
  FOR EACH ROW EXECUTE FUNCTION public.audit_stone_lines();
