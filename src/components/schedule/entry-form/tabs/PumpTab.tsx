/**
 * Pump tab for entry form - Pump Vendor, Invoice details
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineAddSelect } from "../../InlineAddSelect";
import { usePumpVendors } from "@/hooks/useReferenceData";
import type { EntryFormValues } from "../types";

interface PumpTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
  showInlineAdd?: boolean;
}

export function PumpTab({ formData, updateField, showInlineAdd = true }: PumpTabProps) {
  const { data: pumpVendors = [] } = usePumpVendors();

  return (
    <div className="space-y-4">
      {showInlineAdd ? (
        <InlineAddSelect
          label="Pump Vendor"
          value={formData.pump_vendor_id}
          onChange={(v) => updateField("pump_vendor_id", v)}
          options={pumpVendors}
          placeholder="Select pump vendor"
          tableName="pump_vendors"
          queryKey="pump-vendors-active"
          hasCode={true}
          showCode={true}
        />
      ) : (
        <div className="space-y-2">
          <Label>Pump Vendor</Label>
          <Select value={formData.pump_vendor_id} onValueChange={(v) => updateField("pump_vendor_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select pump vendor" />
            </SelectTrigger>
            <SelectContent>
              {pumpVendors.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Invoice #</Label>
          <Input
            value={formData.pump_invoice_number}
            onChange={(e) => updateField("pump_invoice_number", e.target.value)}
            placeholder="Invoice #"
          />
        </div>
        <div className="space-y-2">
          <Label>Invoice Amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.pump_invoice_amount}
            onChange={(e) => updateField("pump_invoice_amount", e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pump Notes</Label>
        <Textarea
          value={formData.pump_notes}
          onChange={(e) => updateField("pump_notes", e.target.value)}
          placeholder="Notes related to pump vendor..."
          rows={3}
        />
      </div>
    </div>
  );
}
