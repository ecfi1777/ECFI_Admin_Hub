import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AutocompleteInput } from "./AutocompleteInput";
import { ExtraFormValues, InvoiceExtra } from "./types";

const schema = z.object({
  entry_date: z.string().min(1, { message: "Date is required" }),
  builder_name: z
    .string()
    .trim()
    .min(1, { message: "Builder / Customer is required" })
    .max(120, { message: "Builder / Customer must be under 120 characters" }),
  location_name: z.string().trim().max(120).optional(),
  lot_number: z.string().trim().max(60).optional(),
  description: z
    .string()
    .trim()
    .min(1, { message: "Description is required" })
    .max(500, { message: "Description must be under 500 characters" }),
  amount: z.string().trim().max(20).optional(),
  invoice_number: z.string().trim().max(60).optional(),
});

const emptyValues = (): ExtraFormValues => ({
  entry_date: new Date().toISOString().slice(0, 10),
  builder_name: "",
  location_name: "",
  lot_number: "",
  description: "",
  amount: "",
  invoice_number: "",
});

interface ExtraEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: InvoiceExtra | null;
  builderSuggestions: string[];
  locationSuggestions: string[];
  onSave: (values: ExtraFormValues) => Promise<void>;
  isSaving: boolean;
}

export function ExtraEntryDialog({
  open,
  onOpenChange,
  editing,
  builderSuggestions,
  locationSuggestions,
  onSave,
  isSaving,
}: ExtraEntryDialogProps) {
  const [values, setValues] = useState<ExtraFormValues>(emptyValues);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setValues({
        entry_date: editing.entry_date,
        builder_name: editing.builder_name,
        location_name: editing.location_name || "",
        lot_number: editing.lot_number || "",
        description: editing.description,
        amount: editing.amount != null ? String(editing.amount) : "",
        invoice_number: editing.invoice_number || "",
      });
    } else {
      setValues(emptyValues());
    }
  }, [open, editing]);

  const set = (key: keyof ExtraFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (values.amount.trim() && Number.isNaN(Number(values.amount.trim()))) {
      toast.error("Amount must be a number");
      return;
    }
    await onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Extra" : "Add Extra"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="extra-date">Date</Label>
              <Input
                id="extra-date"
                type="date"
                value={values.entry_date}
                onChange={(e) => set("entry_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-builder">Builder / Customer *</Label>
              <AutocompleteInput
                id="extra-builder"
                value={values.builder_name}
                onChange={(v) => set("builder_name", v)}
                suggestions={builderSuggestions}
                placeholder="e.g. DRB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-location">Location</Label>
              <AutocompleteInput
                id="extra-location"
                value={values.location_name}
                onChange={(v) => set("location_name", v)}
                suggestions={locationSuggestions}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-lot">Lot</Label>
              <Input
                id="extra-lot"
                value={values.lot_number}
                maxLength={60}
                onChange={(e) => set("lot_number", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-description">Description *</Label>
            <Textarea
              id="extra-description"
              value={values.description}
              maxLength={500}
              rows={3}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. Cut footings for gas company"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="extra-amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="extra-amount"
                  value={values.amount}
                  inputMode="decimal"
                  className="pl-6"
                  onChange={(e) => set("amount", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="extra-invoice">Invoice #</Label>
              <Input
                id="extra-invoice"
                value={values.invoice_number}
                maxLength={60}
                onChange={(e) => set("invoice_number", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Saving..." : editing ? "Save Changes" : "Add Extra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
