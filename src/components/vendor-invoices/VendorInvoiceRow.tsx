import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { VendorInvoiceRowData, VendorTypeFilter } from "./types";
import { useOrganization } from "@/hooks/useOrganization";

interface VendorInvoiceRowProps {
  row: VendorInvoiceRowData;
  typeFilter: VendorTypeFilter;
  isMobile: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  showCheckboxCol: boolean;
}

const formatCurrency = (val: string | number | null | undefined) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (num == null || isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
};

const TYPE_BADGE_STYLES: Record<string, string> = {
  concrete: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  stone: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  pump: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  inspection: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  
};

// Map vendor type to the invoice number column name on schedule_entries
const INVOICE_NUMBER_FIELD: Record<string, string> = {
  concrete: "ready_mix_invoice_number",
  stone: "stone_invoice_number",
  pump: "pump_invoice_number",
  inspection: "inspection_invoice_number",
};

export function VendorInvoiceRow({
  row,
  typeFilter,
  isMobile,
  isSelected,
  onToggleSelect,
  showCheckboxCol,
}: VendorInvoiceRowProps) {
  const { entry, type } = row;
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const [invoiceNumber, setInvoiceNumber] = useState(
    type === "concrete"
      ? (entry.ready_mix_invoice_number ?? "")
      : type === "stone"
        ? (entry.stone_invoice_number ?? "")
        : type === "pump"
          ? (entry.pump_invoice_number ?? "")
          : type === "inspection"
            ? (entry.inspection_invoice_number ?? "")
            : ""
  );
  const [yards, setYards] = useState(
    type === "concrete"
      ? (entry.ready_mix_yards_billed?.toString() ?? "")
      : type === "stone"
        ? (entry.stone_tons_billed?.toString() ?? "")
        : ""
  );
  const [amount, setAmount] = useState(
    type === "concrete"
      ? (entry.ready_mix_invoice_amount?.toString() ?? "")
      : type === "stone"
        ? (entry.stone_invoice_amount?.toString() ?? "")
        : type === "pump"
          ? (entry.pump_invoice_amount?.toString() ?? "")
          : type === "inspection"
            ? (entry.inspection_amount?.toString() ?? "")
            : ""
  );

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const doSave = useCallback(async () => {
    const updates: Record<string, string | number | null> = {};
    if (type === "concrete") {
      updates.ready_mix_invoice_number = invoiceNumber || null;
      updates.ready_mix_yards_billed = yards ? parseFloat(yards) : null;
      updates.ready_mix_invoice_amount = amount ? parseFloat(amount) : null;
    } else if (type === "stone") {
      updates.stone_invoice_number = invoiceNumber || null;
      updates.stone_tons_billed = yards ? parseFloat(yards) : null;
      updates.stone_invoice_amount = amount ? parseFloat(amount) : null;
    } else if (type === "pump") {
      updates.pump_invoice_number = invoiceNumber || null;
      updates.pump_invoice_amount = amount ? parseFloat(amount) : null;
    } else if (type === "inspection") {
      updates.inspection_invoice_number = invoiceNumber || null;
      updates.inspection_amount = amount ? parseFloat(amount) : null;
    }
    const { error } = await supabase
      .from("schedule_entries")
      .update(updates)
      .eq("id", entry.id);
    if (error) throw error;
  }, [type, invoiceNumber, yards, amount, entry.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Check for duplicate invoice number before saving
      const trimmed = invoiceNumber.trim();
      if (trimmed && organizationId) {
        const field = INVOICE_NUMBER_FIELD[type];
        const { data: duplicates, error: dupError } = await supabase
          .from("schedule_entries")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("deleted", false)
          .eq(field, trimmed)
          .neq("id", entry.id)
          .limit(1);
        if (dupError) throw dupError;
        if (duplicates && duplicates.length > 0) {
          // Signal duplicate found — mutation will be aborted
          throw { __duplicate: true };
        }
      }
      await doSave();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-invoice-entries"] });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data saved`);
    },
    onError: (err: any) => {
      if (err?.__duplicate) {
        setShowDuplicateWarning(true);
        return;
      }
      toast.error("Failed to save");
    },
  });

  const forceSaveMutation = useMutation({
    mutationFn: doSave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-invoice-entries"] });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data saved`);
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSave = () => saveMutation.mutate();

  // Column visibility (mirrors VendorInvoiceTable headers)
  const showTypeCol = typeFilter === "all";
  const showInvoiceCol = true;
  const showYardsCol =
    typeFilter === "all" || typeFilter === "concrete" || typeFilter === "stone";
  const showAmountCol = true;

  // Editability — in "all" mode, cells not applicable to this type show "-"
  const canEditInvoice = true;
  const canEditYards = type === "concrete" || type === "stone";
  const canEditAmount = true;

  const isInspection = type === "inspection";
  const showRowCheckbox = showCheckboxCol && isInspection;

  const dateStr = format(
    new Date(entry.scheduled_date + "T00:00:00"),
    "M/d/yyyy"
  );
  const builderName =
    entry.projects?.builders?.code ||
    entry.projects?.builders?.name ||
    "-";
  const locationName = entry.projects?.locations?.name || "-";
  const lotNumber = entry.projects?.lot_number || "-";
  const phaseName = entry.phases?.name || "-";
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  const duplicateDialog = (
    <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Bill Number</AlertDialogTitle>
          <AlertDialogDescription>
            A vendor bill with invoice number "{invoiceNumber.trim()}" already exists. Do you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => forceSaveMutation.mutate()}>
            Add Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const isSaving = saveMutation.isPending || forceSaveMutation.isPending;

  /* ─── Mobile card ─── */
  if (isMobile) {
    return (
      <>
        {duplicateDialog}
        <Card className="mb-3">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {showRowCheckbox && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(entry.id)}
                    aria-label="Select for no charge"
                  />
                )}
                <span className="text-sm font-medium text-foreground">{dateStr}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={TYPE_BADGE_STYLES[type]}>
                  {typeLabel}
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {builderName} · {locationName} · Lot {lotNumber}
            </div>
            <div className="text-sm text-muted-foreground">
              Phase: {phaseName} · {row.vendorName}
            </div>
            <div className="flex flex-wrap gap-2">
                {canEditInvoice && (
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Invoice #"
                    className="h-9 flex-1 min-w-[100px]"
                  />
                )}
                {canEditYards && (
                  <Input
                    type="number"
                    value={yards}
                    onChange={(e) => setYards(e.target.value)}
                    placeholder="Yards"
                    className="h-9 w-28"
                    step="0.01"
                  />
                )}
                {canEditAmount && (
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-9 w-28 pl-5"
                      step="0.01"
                    />
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-9"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
          </CardContent>
        </Card>
      </>
    );
  }

  /* ─── Desktop table row ─── */
  return (
    <>
      {duplicateDialog}
      <TableRow>
        {showCheckboxCol && (
          <TableCell>
            {showRowCheckbox ? (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(entry.id)}
                aria-label="Select for no charge"
              />
            ) : null}
          </TableCell>
        )}
        <TableCell className="text-sm">{dateStr}</TableCell>
        <TableCell className="text-sm">
          {builderName} · {locationName} · {lotNumber}
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">{phaseName}</TableCell>
        {showTypeCol && (
          <TableCell>
            <Badge variant="outline" className={TYPE_BADGE_STYLES[type]}>
              {typeLabel}
            </Badge>
          </TableCell>
        )}
        <TableCell className="text-sm">
          {row.vendorName}
        </TableCell>
        {showInvoiceCol && (
          <TableCell>
            {canEditInvoice ? (
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Invoice #"
                className="h-8 w-28"
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        )}
        {showYardsCol && (
          <TableCell>
            {canEditYards ? (
              <Input
                type="number"
                value={yards}
                onChange={(e) => setYards(e.target.value)}
                placeholder="Yards"
                className="h-8 w-24"
                step="0.01"
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        )}
        {showAmountCol && (
          <TableCell>
            {canEditAmount ? (
              <div className="relative flex items-center">
                <span className="absolute left-2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-8 w-28 pl-5"
                  step="0.01"
                />
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
        )}
        <TableCell>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
            className="h-8"
          >
            <Save className="w-4 h-4" />
          </Button>
        </TableCell>
      </TableRow>
    </>
  );
}
