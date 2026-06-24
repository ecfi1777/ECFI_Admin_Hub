## Fix commission crew attribution

In `src/components/reports/CommissionReport.tsx`, change the per-project crew grouping so the crew is derived from the **wall entry that falls inside the selected report month**, instead of "first entry with a crew."

Attribution priority:
1. Wall entry scheduled within the report month (with a crew)
2. Otherwise, latest wall entry overall
3. Otherwise, footing entry
4. Otherwise, any entry with a crew

No schema changes. No data migration. Past months re-group automatically on next load (e.g. Karma Construction will move from Crew 800 to Crew 1200 for May 2026).