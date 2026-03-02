
-- Stone Suppliers table (mirrors suppliers table structure)
CREATE TABLE public.stone_suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stone_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stone_suppliers in their org"
  ON public.stone_suppliers FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = stone_suppliers.organization_id));

CREATE POLICY "Users can insert stone_suppliers in their org"
  ON public.stone_suppliers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = stone_suppliers.organization_id));

CREATE POLICY "Users can update stone_suppliers in their org"
  ON public.stone_suppliers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = stone_suppliers.organization_id));

-- Stone Types table (mirrors concrete_mixes table structure)
CREATE TABLE public.stone_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stone_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stone_types in their org"
  ON public.stone_types FOR SELECT
  USING (EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = stone_types.organization_id));

CREATE POLICY "Users can insert stone_types in their org"
  ON public.stone_types FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = stone_types.organization_id));

CREATE POLICY "Users can update stone_types in their org"
  ON public.stone_types FOR UPDATE
  USING (EXISTS (SELECT 1 FROM organization_memberships WHERE user_id = auth.uid() AND organization_id = stone_types.organization_id));

-- Add stone columns to schedule_entries
ALTER TABLE public.schedule_entries
  ADD COLUMN stone_supplier_id uuid REFERENCES public.stone_suppliers(id),
  ADD COLUMN stone_type_id uuid REFERENCES public.stone_types(id),
  ADD COLUMN stone_tons_billed numeric DEFAULT 0,
  ADD COLUMN stone_invoice_number text,
  ADD COLUMN stone_invoice_amount numeric DEFAULT 0,
  ADD COLUMN stone_notes text;

-- Updated_at triggers for new tables
CREATE TRIGGER update_stone_suppliers_updated_at
  BEFORE UPDATE ON public.stone_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stone_types_updated_at
  BEFORE UPDATE ON public.stone_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
