/**
 * Stone tab for entry form — supports MULTIPLE stone suppliers per entry.
 * Each "line" is one supplier + type + qty/invoice/tons/notes + a required
 * P&L Category (Basement & Garage Stone | Exterior Stone) that drives which
 * Project P&L card the cost rolls into.
 */

import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineAddSelect } from "../../InlineAddSelect";
import { useStoneSuppliers, useStoneTypes } from "@/hooks/useReferenceData";
import type { EntryFormValues, StoneLineFormValue, StonePlCategory } from "../types";

interface StoneTabProps {
  formData: EntryFormValues;
  updateField: <K extends keyof EntryFormValues>(field: K, value: EntryFormValues[K]) => void;
  addStoneLine?: () => void;
  updateStoneLine?: (index: number, patch: Partial<StoneLineFormValue>) => void;
  removeStoneLine?: (index: number) => void;
  showInlineAdd?: boolean;
  /** Default P&L category for newly created lines and empty lines on load. */
  defaultPlCategory?: Exclude<StonePlCategory, "">;
}

const CATEGORY_OPTIONS: { value: Exclude<StonePlCategory, "">; label: string }[] = [
  { value: "basement_garage", label: "Interior Slab Stone" },
  { value: "exterior", label: "Exterior Slab Stone" },
];

const emptyLine = (defaultPlCategory: StonePlCategory): StoneLineFormValue => ({
  supplier_id: "",
  stone_type_id: "",
  pl_category: defaultPlCategory,
  qty_ordered: "",
  order_number: "",
  invoice_number: "",
  invoice_amount: "",
  tons_billed: "",
  notes: "",
});

export function StoneTab({
  formData,
  updateField,
  addStoneLine,
  updateStoneLine,
  removeStoneLine,
  showInlineAdd = true,
  defaultPlCategory = "basement_garage",
}: StoneTabProps) {
  const { data: stoneSuppliers = [] } = useStoneSuppliers();
  const { data: stoneTypes = [] } = useStoneTypes();

  // Ensure at least one supplier line exists so the form is never empty.
  useEffect(() => {
    if (formData.stone_lines.length === 0) {
      if (addStoneLine) {
        addStoneLine();
      } else {
        updateField("stone_lines", [emptyLine(defaultPlCategory)]);
      }
    }
  }, [formData.stone_lines.length, addStoneLine, updateField, defaultPlCategory]);

  // Backfill empty pl_category on existing/loaded lines with the default
  useEffect(() => {
    formData.stone_lines.forEach((l, idx) => {
      if (!l.pl_category) {
        if (updateStoneLine) {
          updateStoneLine(idx, { pl_category: defaultPlCategory });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.stone_lines.length, defaultPlCategory]);

  const patchLine = (index: number, patch: Partial<StoneLineFormValue>) => {
    if (updateStoneLine) {
      updateStoneLine(index, patch);
    } else {
      const next = formData.stone_lines.map((l, i) => (i === index ? { ...l, ...patch } : l));
      updateField("stone_lines", next);
    }
  };

  const deleteLine = (index: number) => {
    if (removeStoneLine) {
      removeStoneLine(index);
    } else {
      updateField("stone_lines", formData.stone_lines.filter((_, i) => i !== index));
    }
  };

  const appendLine = () => {
    if (addStoneLine) {
      addStoneLine();
    } else {
      updateField("stone_lines", [...formData.stone_lines, emptyLine(defaultPlCategory)]);
    }
  };

  return (
    <div className="space-y-4">
      {formData.stone_lines.map((line, idx) => (
        <div
          key={line.id ?? `new-${idx}`}
          className="rounded-md border border-border bg-muted/20 p-3 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">
              Supplier {idx + 1}
            </h4>
            {formData.stone_lines.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => deleteLine(idx)}
                title="Remove this supplier"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={line.pl_category || ""}
              onValueChange={(v) => patchLine(idx, { pl_category: v as StonePlCategory })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Basement &amp; Garage rolls into the Slab P&amp;L. Exterior rolls into Footings &amp; Walls P&amp;L.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {showInlineAdd ? (
              <InlineAddSelect
                label="Supplier"
                value={line.supplier_id}
                onChange={(v) => patchLine(idx, { supplier_id: v })}
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
                <Select
                  value={line.supplier_id}
                  onValueChange={(v) => patchLine(idx, { supplier_id: v === "__none__" ? "" : v })}
                >
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
              <Label>Stone Type <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Select
                value={line.stone_type_id}
                onValueChange={(v) => patchLine(idx, { stone_type_id: v === "__none__" ? "" : v })}
              >
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
              <Label>Tons</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={line.qty_ordered}
                onChange={(e) => patchLine(idx, { qty_ordered: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                value={line.order_number}
                onChange={(e) => patchLine(idx, { order_number: e.target.value })}
                placeholder="Order #"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Invoice #</Label>
              <Input
                value={line.invoice_number}
                onChange={(e) => patchLine(idx, { invoice_number: e.target.value })}
                placeholder="Invoice #"
              />
            </div>
            <div className="space-y-2">
              <Label>Invoice Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={line.invoice_amount}
                onChange={(e) => patchLine(idx, { invoice_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Tons Billed</Label>
              <Input
                type="number"
                step="0.01"
                value={line.tons_billed}
                onChange={(e) => patchLine(idx, { tons_billed: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stone Notes</Label>
            <Textarea
              value={line.notes}
              onChange={(e) => patchLine(idx, { notes: e.target.value })}
              placeholder="Notes related to stone..."
              rows={2}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={appendLine}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Supplier
      </Button>
    </div>
  );
}
