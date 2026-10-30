export interface PayrollRecon {
  crew_id: string;
  month: number;
  year: number;
  quickbooks_amount: number | null;
  payroll_used_amount: number | null;
  adjustment_notes: string | null;
  amount_paid: number | null;
  labor_allowance_snapshot: number | null;
}

/** Commission due = labor allowance − payroll actually used. */
export const commissionDue = (allowance: number, payrollUsed: number | null) =>
  allowance - (payrollUsed ?? 0);

/** Over/under for a month: paid − due. Null until something has been paid. */
export const monthOverUnder = (allowance: number, payrollUsed: number | null, paid: number | null) =>
  paid == null ? 0 : paid - commissionDue(allowance, payrollUsed);

/**
 * Running carry-forward for a crew through (and including) the given month.
 * Prior months use their saved allowance snapshot; the current month uses the live allowance.
 * Positive = crew overpaid to date; negative = underpaid to date.
 */
export function carryForward(
  rows: PayrollRecon[],
  crewId: string,
  month: number,
  year: number,
  currentAllowance: number
): number {
  const key = year * 12 + month;
  return rows
    .filter((r) => r.crew_id === crewId && r.year * 12 + r.month <= key)
    .reduce((sum, r) => {
      const isCurrent = r.year * 12 + r.month === key;
      const allowance = isCurrent ? currentAllowance : r.labor_allowance_snapshot ?? 0;
      return sum + monthOverUnder(allowance, r.payroll_used_amount, r.amount_paid);
    }, 0);
}
