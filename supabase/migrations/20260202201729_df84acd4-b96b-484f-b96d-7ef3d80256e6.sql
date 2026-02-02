-- Create a table for daily notes (not associated with specific jobs)
CREATE TABLE public.daily_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_date DATE NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.daily_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view daily_notes"
ON public.daily_notes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert daily_notes"
ON public.daily_notes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update daily_notes"
ON public.daily_notes
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_notes_updated_at
BEFORE UPDATE ON public.daily_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();