ALTER TABLE schedule_entries 
  ADD COLUMN IF NOT EXISTS crew_hours numeric(6,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS crew_labor_cost_override numeric(12,2) DEFAULT NULL;