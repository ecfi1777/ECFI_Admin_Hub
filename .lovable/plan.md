# Monthly Commission Payroll Reconciliation (per crew)

## What you'll see

On the Commission Report, under each crew's totals (next to the existing crew notes), a new "Payroll Reconciliation" box for the selected month:

| # | Field | Source |
|---|---|---|
| 1 | QuickBooks commission payroll report | You enter |
| 2 | Payroll figure actually used | You enter |
| 3 | Adjustment notes (e.g. "$1,850 credit to labor to keep key employees") | You enter |
| 4 | Total monthly labor allowance | Pulled from that crew's report total |
| 5 | Commission due = #4 − #2 | Calculated (green if positive, red if negative) |
| 6 | Amount actually paid | You enter |
| — | This month's over/under = #6 − #5 | Calculated |
| — | Carry-forward balance | Running total of every month's over/under for this crew, up to and including this month |

Carry-forward sign: positive = crew has been paid more than calculated (they owe back); negative = paid less (owed to them). The label will spell this out ("Overpaid $X to date" / "Underpaid $X to date").

- Money fields click to edit, same as other editable figures on the report; saving happens automatically.
- Only Owners/Managers can see and edit this box (it's payroll money); Viewers won't see it.
- Excel export gets these rows added under each crew's totals.

## Technical notes

- New table `commission_payroll_reconciliations`: organization_id, crew_id, month, year, quickbooks_amount, payroll_used_amount, adjustment_notes, amount_paid, labor_allowance_snapshot, timestamps. Unique (organization_id, crew_id, month, year). GRANTs to authenticated/service_role, RLS via existing `user_has_manage_access` for all operations.
- `labor_allowance_snapshot` saved whenever the row is saved, so past months' carry-forward stays stable even if the report changes later; current month display uses the live total.
- Carry-forward = sum over all prior saved months for the crew of (amount_paid − (allowance_snapshot − payroll_used)), plus this month's.
- New component `src/components/reports/PayrollReconciliationBlock.tsx` (keeps CommissionReport.tsx from growing); data fetched in `CommissionReport.tsx` with one query per org and passed down. Upsert pattern mirrors `commission_report_notes`.
