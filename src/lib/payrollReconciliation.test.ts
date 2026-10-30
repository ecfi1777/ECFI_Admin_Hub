import { describe, it, expect } from "vitest";
import { commissionDue, carryForward, PayrollRecon } from "./payrollReconciliation";

const row = (month: number, used: number, paid: number | null, snap: number): PayrollRecon => ({
  crew_id: "c1", month, year: 2026, quickbooks_amount: null, payroll_used_amount: used,
  adjustment_notes: null, amount_paid: paid, labor_allowance_snapshot: snap,
});

describe("payroll reconciliation", () => {
  it("commission due is allowance minus payroll used, can be negative", () => {
    expect(commissionDue(10000, 8000)).toBe(2000);
    expect(commissionDue(5000, 6000)).toBe(-1000);
  });

  it("carry-forward sums paid minus due across months", () => {
    const rows = [row(8, 8000, 2500, 10000), row(9, 6000, 3000, 9000)];
    // Aug: due 2000, paid 2500 → +500. Sep live allowance 9000: due 3000, paid 3000 → 0.
    expect(carryForward(rows, "c1", 9, 2026, 9000)).toBe(500);
    // Only through August
    expect(carryForward(rows, "c1", 8, 2026, 10000)).toBe(500);
  });

  it("unpaid months add nothing to carry-forward", () => {
    expect(carryForward([row(8, 8000, null, 10000)], "c1", 8, 2026, 10000)).toBe(0);
  });
});
