import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TableRow, TableCell } from "@/components/ui/table";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { VendorInvoiceRowData, VendorTypeFilter } from "./types";

interface VendorInvoiceRowProps {
  row: VendorInvoiceRowData;
  typeFilter: VendorTypeFilter;
  isMobile: boolean;
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  concrete: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pump: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  inspection: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  crew: "bg-green-500/10 text-green-500 border-green-500/20",
};

export function VendorInvoiceRow({ row, typeFilter, isMobile }: VendorInvoiceRowProps) {
  const { entry, type } = row;
  const queryClient = useQueryClient();

  const [invoiceNumber, setInvoiceNumber] = useState(
    type === "concrete"
      ? (entry.ready_mix_invoice_number ?? "")
      : type === "pump"
        ? (entry.pump_invoice_number ?? "")
        : type === "inspection"
          ? (entry.inspection_invoice_number ?? "")
          : ""
  );
  const [yards, setYards] = useState(
    type === "concrete"
      ? (entry.ready_mix_yards_billed?.toString() ?? "")
      : type === "crew"
        ? (entry.crew_yards_poured?.toString() ?? "")
        : ""
  );
  const [amount, setAmount] = useState(
    type === "concrete"
      ? (entry.ready_mix_invoice_amount?.toString() ?? "")
      : type === "pump"
        ? (entry.pump_invoice_amount?.toString() ?? "")
        : type === "inspection"
          ? (entry.inspection_amount?.toString() ?? "")
          : ""
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates: Record<string, string | number | null> = {};
      if (type === "concrete") {
        updates.ready_mix_invoice_number = invoiceNumber || null;
        updates.ready_mix_yards_billed = yards ? parseFloat(yards) : null;
        updates.ready_mix_invoice_amount = amount ? parseFloat(amount) : null;
      } else if (type === "pump") {
        updates.pump_invoice_number = invoiceNumber || null;
        updates.pump_invoice_amount = amount ? parseFloat(amount) : null;
      } else if (type === "inspection") {
        updates.inspection_invoice_number = invoiceNumber || null;
        updates.inspection_amount = amount ? parseFloat(amount) : null;
      } else if (type === "crew") {
        updates.crew_yards_poured = yards ? parseFloat(yards) : null;
      }
      const { error } = await supabase
        .from("schedule_entries")
        .update(updates)
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-invoice-entries"] });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data saved`);
    },
    onError: () => toast.error("Failed to save"),
  });

  // Column visibility (mirrors VendorInvoiceTable headers)
  const showTypeCol = typeFilter === "all";
  const showInvoiceCol = typeFilter === "all" || typeFilter !== "crew";
  const showYardsCol =
    typeFilter === "all" || typeFilter === "concrete" || typeFilter === "crew";
  const showAmountCol = typeFilter === "all" || typeFilter !== "crew";

  // Editability — in "all" mode, cells not applicable to this type show "-"
  const canEditInvoice = type !== "crew";
  const canEditYards = type === "concrete" || type === "crew";
  const canEditAmount = type !== "crew";

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

  /* ─── Mobile card ─── */
  if (isMobile) {
    return (
      <Card className="mb-3">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{dateStr}</span>
            <Badge variant="outline" className={TYPE_BADGE_STYLES[type]}>
              {typeLabel}
            </Badge>
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
                placeholder={type === "crew" ? "Crew Yards" : "Yards"}
                className="h-9 w-28"
                step="0.01"
              />
            )}
            {canEditAmount && (
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount $"
                className="h-9 w-28"
                step="0.01"
              />
            )}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-9"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ─── Desktop table row ─── */
  return (
    <TableRow>
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
      <TableCell className="text-sm">{row.vendorName}</TableCell>
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
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="$"
              className="h-8 w-24"
              step="0.01"
            />
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
      )}
      <TableCell>
        <Button
          size="sm"
          variant="outline"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="h-8"
        >
          <Save className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
