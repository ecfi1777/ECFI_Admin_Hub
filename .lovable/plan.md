# Payment notes + carry-forward balance history

## What you'll get

1. **Payment note (item 6)** — a small note box right under "Amount actually paid" for that month (e.g. "Draw forward", "Extra labor for projects finishing next month"). Separate from the item 3 deductions notes.

2. **"Balance notes" link under Carry-forward balance** — collapsed by default. Shows e.g. "Balance notes (3)". Clicking opens a pop-up window for that crew listing every month up to the selected one:

| Month | Due | Paid | Over / Under | Running balance | Note |
|---|---|---|---|---|---|
| Aug 2026 | $9,500.00 | $10,000.00 | +$500.00 | +$500.00 | Draw forward |
| Sep 2026 | ... | ... | ... | ... | ... |

   - Only months with an amount paid or a note are listed, oldest first.
   - The running balance matches the carry-forward number, so you can see exactly how it was built.
   - You can click a note in the pop-up to edit it.

Why a pop-up instead of expanding inline: the history grows every month, and a pop-up keeps each crew's box compact while giving the table room to read.

Owners and Managers only, same as the rest of the box.

## Technical notes

- Migration: add nullable `payment_notes text` to `commission_payroll_reconciliations` (no other changes; existing RLS/grants cover it).
- `src/lib/payrollReconciliation.ts`: add `carryForwardHistory(rows, crewId, month, year, currentAllowance)` returning per-month rows with due, paid, over/under, running balance, notes; uses the same snapshot-allowance logic as `carryForward`. Add a test that its final running balance equals `carryForward`.
- New `src/components/reports/BalanceNotesDialog.tsx` (Dialog + table, inline note edit calling the existing save).
- `PayrollReconciliationBlock.tsx`: add payment note input under item 6, add "Balance notes (n)" button under carry-forward; extend `ReconPatch` with `payment_notes`.
- `CommissionReport.tsx`: pass crew's history rows into the block; include payment notes in the export's reconciliation section.
