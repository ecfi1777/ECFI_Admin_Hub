/**
 * Stone tab for entry form - Stone Supplier, Stone Type, Invoice details
 * Used when the phase is "Prep Slabs" instead of the Concrete tab.
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
import { useStoneSuppliers, useStoneTypes } from "@/hooks/useReferenceData";
import type { EntryFormValues } from "../types";

interface StoneTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
  showInlineAdd?: boolean;
}

export function StoneTab({ formData, updateField, showInlineAdd = true }: StoneTabProps) {
  const { data: stoneSuppliers = [] } = useStoneSuppliers();
  const { data: stoneTypes = [] } = useStoneTypes();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {showInlineAdd ? (
          <InlineAddSelect
            label="Supplier"
            value={formData.stone_supplier_id}
            onChange={(v) => updateField("stone_supplier_id", v)}
            options={stoneSuppliers}
            placeholder="Select supplier"
            tableName="stone_suppliers"
            queryKey="stone-suppliers-active"
            hasCode={true}
            showCode={true}
          />
        ) : (
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={formData.stone_supplier_id} onValueChange={(v) => updateField("stone_supplier_id", v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-muted-foreground">— None —</SelectItem>
                {stoneSuppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Stone Type</Label>
          <Select value={formData.stone_type_id} onValueChange={(v) => updateField("stone_type_id", v === "__none__" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-muted-foreground">— None —</SelectItem>
              {stoneTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Qty Ordered</Label>
          <Input
            value={formData.qty_ordered}
            onChange={(e) => updateField("qty_ordered", e.target.value)}
            placeholder="e.g. 10+"
          />
        </div>
        <div className="space-y-2">
          <Label>Order Number</Label>
          <Input
            value={formData.order_number}
            onChange={(e) => updateField("order_number", e.target.value)}
            placeholder="Order #"
          />
        </div>
      </div>

      <hr className="border-border my-4" />
      <h4 className="text-sm font-medium text-muted-foreground">Stone Invoice</h4>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Invoice #</Label>
          <Input
            value={formData.stone_invoice_number}
            onChange={(e) => updateField("stone_invoice_number", e.target.value)}
            placeholder="Invoice #"
          />
        </div>
        <div className="space-y-2">
          <Label>Invoice Amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.stone_invoice_amount}
            onChange={(e) => updateField("stone_invoice_amount", e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Tons Billed</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.stone_tons_billed}
            onChange={(e) => updateField("stone_tons_billed", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Stone Notes</Label>
        <Textarea
          value={formData.stone_notes}
          onChange={(e) => updateField("stone_notes", e.target.value)}
          placeholder="Notes related to stone..."
          rows={3}
        />
      </div>
    </div>
  );
}
