## Goal

When numbers are entered on the P&L tab, they should show up in the Commission Report — and vice versa — for **Base House, Extras, Other Costs, and Labor**.

## Current state

Both surfaces already read/write the same underlying rows for three of the four fields, so those already sync:

| Field | Storage | P&L tab | Commission Report |
|---|---|---|---|
| Base House | `project_pl_revenue.base_house` (section = `footings_walls`) | reads/writes | reads/writes |
| Extras | `project_pl_revenue.extras` | reads/writes | reads/writes |
| Other Costs (F&W) | `project_other_costs` rows in `footings_walls` | reads/writes (as line items) | reads sum; writes single "Other" row |
| **Labor** | Split: P&L uses `project_pl_revenue.labor_override`; Commission Report reads `project_commissions.override_amount` | writes `labor_override` only | writes both, but only reads `override_amount` |

The one real gap is **Labor**: numbers entered on the P&L tab land in `labor_override`, but the Commission Report never looks there, so the Labor Allow. column stays blank until the user re-enters the same figure in the Commission Report or Commission tab.

## Changes

### 1. Commission Report reads P&L labor as a fallback
File: `src/components/reports/CommissionReport.tsx`

- Extend the `project_pl_revenue` query to also select `labor_override`.
- In the row-building loop, extend the Labor Allow. resolution to:
  1. local unsaved override (`ov.labor_allow`) — unchanged
  2. `project_commissions.override_amount` — unchanged
  3. **new:** `project_pl_revenue.labor_override` for that project's `footings_walls` row
  4. calc-method result (`per_cy` × yards, or `pct_invoice` × invoice) — unchanged

This makes any labor number entered on the P&L tab visible in the Commission Report immediately.

### 2. P&L tab mirrors labor into `project_commissions`
File: `src/components/projects/ProjectPLTab.tsx` (the labor-override save path around lines 700–750)

When the P&L tab writes `labor_override`, also upsert `project_commissions.override_amount` for the same project so the Commission tab summary and any legacy consumers stay in sync — mirroring exactly what the Commission Report already does in the reverse direction.

- Find the existing `project_commissions` row for the project (any crew); if none, upsert one under the project's wall-anchor crew for the month (fall back to the first crew found on the project's wall entries, same lookup pattern the Commission tab uses).
- Set `override_amount = labor_override` (or `null` when the user clears the field).

### 3. Cache invalidation
After the P&L save, invalidate:
- `["commission-report-*"]` queries so an open Commission Report refreshes
- `["commission-saved", projectId]` so the Commission tab refreshes

The Commission Report already invalidates `["pl-revenue", projectId]` when it saves, so the reverse direction keeps working.

## Not changing

- Base House / Extras / Other Costs: already share the same DB rows, so edits on either side already appear on the other after the standard query refresh. No code change needed.
- Interior Slab / Exterior Slab P&L sections: the Commission Report is F&W-only by design (that's what commissions are paid on), so slab-section P&L values remain out of scope. Let me know if you want them rolled in too.

## Technical notes

- No schema changes.
- No new tables, no new RLS.
- All three edits stay within the two component files listed above plus the shared crew-anchor helper already used by `ProjectCommissionTab` and `CommissionReport`.
