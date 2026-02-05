-- Create concrete_mixes reference table
CREATE TABLE public.concrete_mixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concrete_mixes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view concrete_mixes"
ON public.concrete_mixes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert concrete_mixes"
ON public.concrete_mixes FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update concrete_mixes"
ON public.concrete_mixes FOR UPDATE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_concrete_mixes_updated_at
BEFORE UPDATE ON public.concrete_mixes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default concrete mixes
INSERT INTO public.concrete_mixes (name, display_order) VALUES
  ('2500psi Non Air', 1),
  ('3000psi Non Air', 2),
  ('3000psi AE', 3),
  ('3500psi AE', 4);

-- Add new columns to schedule_entries
ALTER TABLE public.schedule_entries
ADD COLUMN concrete_mix_id UUID REFERENCES public.concrete_mixes(id),
ADD COLUMN additive_hot_water BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN additive_1_percent_he BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN additive_2_percent_he BOOLEAN NOT NULL DEFAULT false;