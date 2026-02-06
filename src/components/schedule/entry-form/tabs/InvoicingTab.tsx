/**
 * Invoicing tab for entry form - To Be Invoiced flag
 */

import { Label } from "@/components/ui/label";
import type { EntryFormValues } from "../types";

interface InvoicingTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
}

export function InvoicingTab({ formData, updateField }: InvoicingTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="to_be_invoiced"
          checked={formData.to_be_invoiced}
          onChange={(e) => updateField("to_be_invoiced", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="to_be_invoiced">Mark as "To Be Invoiced"</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Note: "Invoice Complete" status is managed from the Invoices page.
      </p>
    </div>
  );
}
