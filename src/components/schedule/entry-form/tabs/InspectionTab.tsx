/**
 * Inspection tab for entry form - Type, Inspector, Invoice details
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
import { useInspectionTypes, useInspectors } from "@/hooks/useReferenceData";
import type { EntryFormValues } from "../types";

interface InspectionTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
  showInlineAdd?: boolean;
}

export function InspectionTab({ formData, updateField, showInlineAdd = true }: InspectionTabProps) {
  const { data: inspectionTypes = [] } = useInspectionTypes();
  const { data: inspectors = [] } = useInspectors();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {showInlineAdd ? (
          <>
            <InlineAddSelect
              label="Inspection Type"
              value={formData.inspection_type_id}
              onChange={(v) => updateField("inspection_type_id", v)}
              options={inspectionTypes}
              placeholder="Select type"
              tableName="inspection_types"
              queryKey="inspection-types-active"
            />
            <InlineAddSelect
              label="Inspected By"
              value={formData.inspector_id}
              onChange={(v) => updateField("inspector_id", v)}
              options={inspectors}
              placeholder="Select inspector"
              tableName="inspectors"
              queryKey="inspectors-active"
            />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Inspection Type</Label>
              <Select value={formData.inspection_type_id} onValueChange={(v) => updateField("inspection_type_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {inspectionTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Inspector</Label>
              <Select value={formData.inspector_id} onValueChange={(v) => updateField("inspector_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select inspector" />
                </SelectTrigger>
                <SelectContent>
                  {inspectors.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Invoice #</Label>
          <Input
            value={formData.inspection_invoice_number}
            onChange={(e) => updateField("inspection_invoice_number", e.target.value)}
            placeholder="Invoice #"
          />
        </div>
        <div className="space-y-2">
          <Label>Invoice Amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.inspection_amount}
            onChange={(e) => updateField("inspection_amount", e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Inspection Notes</Label>
        <Textarea
          value={formData.inspection_notes}
          onChange={(e) => updateField("inspection_notes", e.target.value)}
          placeholder="Notes related to inspection..."
          rows={3}
        />
      </div>
    </div>
  );
}
