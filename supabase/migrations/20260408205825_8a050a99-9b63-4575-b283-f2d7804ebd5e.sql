-- Drop schedule_entry_financials (all data verified as duplicated in schedule_entries)
DROP TABLE IF EXISTS schedule_entry_financials CASCADE;

-- Drop crew_employees (empty duplicate of crew_members)
DROP TABLE IF EXISTS crew_employees CASCADE;