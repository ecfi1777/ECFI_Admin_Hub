/**
 * Concrete tab for entry form - Supplier, Mix, Additives, Invoice details
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineAddSelect } from "../../InlineAddSelect";
import { useSuppliers, useConcreteMixes } from "@/hooks/useReferenceData";
import type { EntryFormValues } from "../types";

interface ConcreteTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
  showInlineAdd?: boolean;
}

export function ConcreteTab({ formData, updateField, showInlineAdd = true }: ConcreteTabProps) {
  const { data: suppliers = [] } = useSuppliers();
  const { data: concreteMixes = [] } = useConcreteMixes();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {showInlineAdd ? (
          <InlineAddSelect
            label="Supplier"
            value={formData.supplier_id}
            onChange={(v) => updateField("supplier_id", v)}
            options={suppliers}
            placeholder="Select supplier"
            tableName="suppliers"
            queryKey="suppliers-active"
            hasCode={true}
            showCode={true}
          />
        ) : (
          <div className="space-y-2">
            <Label>Supplier</Label>
            <Select value={formData.supplier_id} onValueChange={(v) => updateField("supplier_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Concrete Mix</Label>
          <Select value={formData.concrete_mix_id} onValueChange={(v) => updateField("concrete_mix_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select mix" />
            </SelectTrigger>
            <SelectContent>
              {concreteMixes.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
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
            placeholder="e.g. 10+ or 8+2"
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

      <div className="space-y-2">
        <Label>Additives</Label>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="additive_hot_water"
              checked={formData.additive_hot_water}
              onCheckedChange={(checked) => updateField("additive_hot_water", checked === true)}
            />
            <label htmlFor="additive_hot_water" className="text-sm">Hot Water</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="additive_1_percent_he"
              checked={formData.additive_1_percent_he}
              onCheckedChange={(checked) => updateField("additive_1_percent_he", checked === true)}
            />
            <label htmlFor="additive_1_percent_he" className="text-sm">1% HE</label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="additive_2_percent_he"
              checked={formData.additive_2_percent_he}
              onCheckedChange={(checked) => updateField("additive_2_percent_he", checked === true)}
            />
            <label htmlFor="additive_2_percent_he" className="text-sm">2% HE</label>
          </div>
        </div>
      </div>

      <hr className="border-border my-4" />
      <h4 className="text-sm font-medium text-muted-foreground">Ready Mix Invoice</h4>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Invoice #</Label>
          <Input
            value={formData.ready_mix_invoice_number}
            onChange={(e) => updateField("ready_mix_invoice_number", e.target.value)}
            placeholder="Invoice #"
          />
        </div>
        <div className="space-y-2">
          <Label>Invoice Amount ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.ready_mix_invoice_amount}
            onChange={(e) => updateField("ready_mix_invoice_amount", e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Yards Billed</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.ready_mix_yards_billed}
            onChange={(e) => updateField("ready_mix_yards_billed", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Concrete Notes</Label>
        <Textarea
          value={formData.concrete_notes}
          onChange={(e) => updateField("concrete_notes", e.target.value)}
          placeholder="Notes related to concrete/ready mix..."
          rows={3}
        />
      </div>
    </div>
  );
}
