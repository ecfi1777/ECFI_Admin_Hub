import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { commissionDue, monthOverUnder, PayrollRecon } from "@/lib/payrollReconciliation";

const fmt = (v: number | null | undefined) =>
  v == null ? "—" : `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export type ReconPatch = Partial<Pick<PayrollRecon, "quickbooks_amount" | "payroll_used_amount" | "adjustment_notes" | "amount_paid">>;

function MoneyInput({ value, onSave }: { value: number | null; onSave: (v: number | null) => void }) {
  const [draft, setDraft] = useState(value?.toString() ?? "");
  useEffect(() => setDraft(value?.toString() ?? ""), [value]);
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">$</span>
      <input
        type="number"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft === "" ? null : parseFloat(draft);
          if (next !== value) onSave(next);
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="w-28 h-7 px-2 text-right text-xs border border-input rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

export function PayrollReconciliationBlock({
  crewName,
  record,
  laborAllowance,
  carry,
  onSave,
}: {
  crewName: string;
  record: PayrollRecon | undefined;
  laborAllowance: number;
  carry: number;
  onSave: (patch: ReconPatch) => void;
}) {
  const [notes, setNotes] = useState(record?.adjustment_notes ?? "");
  useEffect(() => setNotes(record?.adjustment_notes ?? ""), [record?.adjustment_notes]);

  const used = record?.payroll_used_amount ?? null;
  const paid = record?.amount_paid ?? null;
  const due = commissionDue(laborAllowance, used);
  const ou = monthOverUnder(laborAllowance, used, paid);
  const sign = (v: number) => (v > 0 ? "text-green-600 dark:text-green-400" : v < 0 ? "text-destructive" : "");

  const Row = ({ n, label, children }: { n: string; label: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground"><span className="font-mono mr-1">{n}</span>{label}</span>
      <div className="text-right font-medium">{children}</div>
    </div>
  );

  return (
    <div className="border-t border-border bg-muted/10 px-3 py-2 text-xs">
      <div className="font-semibold text-muted-foreground mb-1">Payroll Reconciliation — Crew {crewName}</div>
      <div className="grid md:grid-cols-2 gap-x-6">
        <div>
          <Row n="1." label="QuickBooks commission payroll report">
            <MoneyInput value={record?.quickbooks_amount ?? null} onSave={(v) => onSave({ quickbooks_amount: v })} />
          </Row>
          <Row n="2." label="Payroll figure actually used">
            <MoneyInput value={used} onSave={(v) => onSave({ payroll_used_amount: v })} />
          </Row>
          <Row n="4." label="Total monthly labor allowance">{fmt(laborAllowance)}</Row>
          <Row n="5." label="Commission due (4 − 2)"><span className={sign(due)}>{fmt(due)}</span></Row>
          <Row n="6." label="Amount actually paid">
            <MoneyInput value={paid} onSave={(v) => onSave({ amount_paid: v })} />
          </Row>
          <Row n="" label="This month over / under (6 − 5)">{paid == null ? "—" : <span className={sign(ou)}>{fmt(ou)}</span>}</Row>
          <Row n="" label="Carry-forward balance">
            <span className={cn("font-semibold", sign(carry))}>
              {carry === 0 ? "$0.00 — even" : carry > 0 ? `Overpaid ${fmt(carry)} to date` : `Underpaid ${fmt(-carry)} to date`}
            </span>
          </Row>
        </div>
        <div className="pt-1">
          <div className="text-muted-foreground mb-1"><span className="font-mono mr-1">3.</span>Deductions / modifications notes</div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (record?.adjustment_notes ?? "") && onSave({ adjustment_notes: notes })}
            placeholder="e.g. Gave $1,850 credit to labor to keep key employees"
            rows={5}
            className="text-xs resize-y bg-background"
          />
        </div>
      </div>
    </div>
  );
}
