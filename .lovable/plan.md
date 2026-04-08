

## Database Cleanup: Drop Duplicate Tables

### Summary
Drop `schedule_entry_financials` and `crew_employees` from the database. Skip the CHECK constraints since validation triggers already exist.

### Important Findings

**1. Foreign key dependency on `crew_employees`**
The `project_labor_employees` table has a foreign key (`crew_employees_crew_id_fkey`) referencing `crew_employees.id`. Using `CASCADE` will silently drop this FK constraint. Since `crew_employees` has 0 rows, this is safe, but worth noting — `project_labor_employees.crew_employee_id` will become an unconstrained UUID column afterward.

**2. CHECK constraints are unnecessary**
The database already has validation **triggers** for every constraint the migration proposes:
- `validate_calc_method()` — already enforces `calc_method IN ('per_cy', 'pct_invoice')` on `project_commissions`
- `validate_phase_type()` — already enforces `phase_type IN ('footing', 'wall', 'slab', 'other')` on `phases`
- `validate_pl_section()` — already enforces `pl_section IN ('footings_walls', 'slab', 'both', 'overhead')` on `phases`
- `validate_pl_section_two()` — already enforces `pl_section IN ('footings_walls', 'slab')` (used on other cost tables)

Adding CHECK constraints on top of existing triggers creates redundant validation and can cause restore failures (CHECK constraints must be immutable — using `now()` or similar in future constraints would break backups).

Also: `ADD CONSTRAINT IF NOT EXISTS` is not valid PostgreSQL syntax and would cause the migration to fail.

**3. Memory note cleanup**
There is a stored architecture memory (`architecture/financial-isolation`) describing the `schedule_entry_financials` table as an intentional design. This memory should be cleared after dropping the table.

### Recommended Migration

Only the two DROP TABLE statements:

```sql
-- Drop schedule_entry_financials (all data verified as duplicated in schedule_entries)
DROP TABLE IF EXISTS schedule_entry_financials CASCADE;

-- Drop crew_employees (empty duplicate of crew_members)
DROP TABLE IF EXISTS crew_employees CASCADE;
```

### What happens after
- The auto-generated `types.ts` file will update automatically to remove both table type definitions
- No application code references either table (confirmed via search — only `types.ts` mentions them)
- The `project_labor_employees.crew_employee_id` FK will be dropped by CASCADE but the column and existing data remain intact

### Files changed
- **Database migration only** — no application code changes needed

