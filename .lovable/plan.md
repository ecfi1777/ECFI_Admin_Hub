## Combined plan: exclude cancelled costs everywhere + Sub Labor in P&L + split Footing/Wall concrete + fix Total F&W Yards

### 1. Exclude cancelled entries from all cost/yardage rollups

Add `.eq("is_cancelled", false)` to every `schedule_entries` query that feeds a cost, yardage, or commission total. Applies uniformly to Concrete, Stone, Pump, Inspection, and Sub Labor.

Files:
- `src/components/projects/ProjectPLTab.tsx` — `pl-vendor-costs`, `pl-uncategorized`, `pl-schedule-hours` queries.
- `src/components/projects/ProjectCommissionTab.tsx` — `commission-fw-entries` query (fixes inflated yards/concrete totals from cancelled F&W entries).
- `src/components/reports/CommissionReport.tsx` — both `schedule_entries` queries.
- `src/pages/Reports.tsx` — Monthly Backup cost-summary queries.
- `src/pages/Discrepancies.tsx` — verify cancelled rows are excluded.

`VendorInvoices` already excludes cancelled — no change.

### 2. Sub Labor as its own P&L line

In `ProjectPLTab.tsx`:
- Extend the `pl-vendor-costs` select to include `sub_will_invoice`, `sub_invoice_amount`, and `crews(name)`.
- In each P&L section (Footings & Walls, Slab) emit a new **"Sub Labor"** row alongside Concrete / Stone / Pump / Inspection.
- Sum `sub_invoice_amount` for entries in that section where `sub_will_invoice = true` and `is_cancelled = false`.
- Roll into the section's `totalCosts` like any other vendor line.

### 3. Split Footing Concrete vs Wall Concrete (P&L only)

Footings & Walls section of `ProjectPLTab.tsx`:
- Replace the single "Concrete" row with **two rows**:
  - **Footing Concrete** — sum of `ready_mix_invoice_amount` where `phases.phase_type = 'footing'`.
  - **Wall Concrete** — sum of `ready_mix_invoice_amount` where `phases.phase_type = 'wall'`.
- Add `phase_type` to the existing `phases(...)` select in `pl-vendor-costs`.
- Slab section stays as a single "Concrete" line (no split).
- Commission tab is untouched — F&W concrete total there stays combined.

### 4. Fix Total F&W Yards = 0

In `ProjectCommissionTab.tsx`, change the `totalFWYards` reducer from `crew_yards_poured` to `ready_mix_yards_billed` (and add it to the select). This is the same field that drives Vendor Bills and Discrepancies, so all three pages will agree. Cancelled entries excluded per #1.

### Out of scope

- No cancel/reschedule workflow, calendar, or audit changes.
- No Labor Tracking / Commission payout recalculations beyond the yardage source swap.
- No new badges or colors.

### Technical notes

- No schema changes — all four items use existing columns.
- `ProjectPLTab.tsx` row builder will need a small refactor to support multiple concrete lines under one section; current code emits one row per vendor type, so adding a `phase_type`-filtered split for F&W and a Sub Labor row are parallel additions.
- `phase_type` on `phases` is already nullable text with values `'footing'` and `'wall'` confirmed in production data.