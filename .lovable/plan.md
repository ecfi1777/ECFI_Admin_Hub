## Problem

Editing "Labor Allow." in the Commission Report only writes to `project_commissions.override_amount`. That value shows up as the Override Amount / Crew Allowance on the Commission tab, but the P&L tab's Labor field stays empty because it reads from `project_pl_revenue.labor_override` — a separate column.

Result on Westridge 59-63V: the $4,275 entered in the report appears on the Commission tab (as override) but the P&L Labor input is blank, so Total Costs on the P&L excludes it.

## Fix

Make the Commission Report's "Labor Allow." edit write to **both** places in a single save:

1. `project_commissions.override_amount` (already happens — drives Commission tab).
2. `project_pl_revenue.labor_override` for `section = 'footings_walls'` (new — drives P&L tab Labor field and the auto-suggested Rate per CY / % of Invoice on the Commission tab).

### File to change

`src/components/reports/CommissionReport.tsx` — inside `handleSave`, in the `field === "labor_allow"` branch (around line 454), add an `upsert` to `project_pl_revenue` mirroring the value into `labor_override`, using the same `onConflict: "project_id,section"` pattern already used for base_house/extras above.

Also invalidate the P&L / commission caches after save so open tabs refresh:
- `["pl-revenue", projectId]`
- `["commission-saved", projectId]`

No schema changes. No changes to P&L or Commission tab components — they already read from these columns.

## Verification

Re-open Westridge 59-63V after saving $4,275 in the report:
- P&L tab → Labor field shows 4275, Total Costs includes it.
- Commission tab → Override Amount still 4275, Crew Allowance $4,275; Rate per CY suggestion now populated from P&L labor.
