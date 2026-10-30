import { SavedNoteField } from "@/components/reports/SavedNoteField";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CarryHistoryRow } from "@/lib/payrollReconciliation";

const fmt = (v: number | null) =>
  v == null ? "—" : `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signed = (v: number) => (v > 0 ? `+${fmt(v)}` : fmt(v));
const tone = (v: number) => (v > 0 ? "text-green-600 dark:text-green-400" : v < 0 ? "text-destructive" : "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


export function BalanceNotesDialog({
  open, onOpenChange, crewName, rows, onSaveNote,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  crewName: string;
  rows: CarryHistoryRow[];
  onSaveNote: (month: number, year: number, note: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Balance notes — Crew {crewName}</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments or notes recorded yet.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-1 pr-2">Month</th>
                  <th className="text-right py-1 px-2">Due</th>
                  <th className="text-right py-1 px-2">Paid</th>
                  <th className="text-right py-1 px-2">Over / Under</th>
                  <th className="text-right py-1 px-2">Running balance</th>
                  <th className="text-left py-1 pl-2 w-[40%]">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.year}-${r.month}`} className="border-b border-border/50">
                    <td className="py-1 pr-2 whitespace-nowrap">{MONTHS[r.month - 1]} {r.year}</td>
                    <td className="text-right px-2">{fmt(r.due)}</td>
                    <td className="text-right px-2">{fmt(r.paid)}</td>
                    <td className={cn("text-right px-2", tone(r.overUnder))}>{r.paid == null ? "—" : signed(r.overUnder)}</td>
                    <td className={cn("text-right px-2 font-semibold", tone(r.running))}>{signed(r.running)}</td>
                    <td className="pl-2"><SavedNoteField value={r.note} onSave={(v) => onSaveNote(r.month, r.year, v)} onDelete={() => onSaveNote(r.month, r.year, "")} rows={2} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
