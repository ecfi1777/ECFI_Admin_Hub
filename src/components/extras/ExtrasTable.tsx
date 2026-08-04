import { useState, useRef, KeyboardEvent } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InvoiceExtra } from "./types";

type EditingCell = { id: string; field: "amount" | "invoice_number"; value: string } | null;

interface ExtrasTableProps {
  extras: InvoiceExtra[];
  isLoading: boolean;
  onToggleComplete: (extra: InvoiceExtra, complete: boolean) => void;
  onEdit: (extra: InvoiceExtra) => void;
  onDelete: (extra: InvoiceExtra) => void;
  onUpdateField: (extra: InvoiceExtra, field: "amount" | "invoice_number", value: string) => Promise<void>;
  isMutating: boolean;
}

export function ExtrasTable({
  extras,
  isLoading,
  onToggleComplete,
  onEdit,
  onDelete,
  onUpdateField,
  isMutating,
}: ExtrasTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) {
    return <div className="text-muted-foreground text-center py-12">Loading...</div>;
  }

  if (extras.length === 0) {
    return <div className="text-muted-foreground text-center py-12">No extras found</div>;
  }

  const startEditing = (extra: InvoiceExtra, field: "amount" | "invoice_number") => {
    const initial = field === "amount"
      ? (extra.amount != null ? String(extra.amount) : "")
      : (extra.invoice_number || "");
    setEditingCell({ id: extra.id, field, value: initial });
    setTimeout(() => {
      (field === "amount" ? amountInputRef : invoiceInputRef).current?.focus();
      (field === "amount" ? amountInputRef : invoiceInputRef).current?.select();
    }, 0);
  };

  const commit = async () => {
    if (!editingCell) return;
    const extra = extras.find((e) => e.id === editingCell.id);
    if (!extra) {
      setEditingCell(null);
      return;
    }
    const currentValue = editingCell.field === "amount"
      ? (extra.amount != null ? String(extra.amount) : "")
      : (extra.invoice_number || "");
    if (editingCell.value === currentValue) {
      setEditingCell(null);
      return;
    }
    try {
      await onUpdateField(extra, editingCell.field, editingCell.value);
    } catch {
      toast.error("Failed to update");
    } finally {
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const renderAmountCell = (extra: InvoiceExtra) => {
    if (editingCell?.id === extra.id && editingCell.field === "amount") {
      return (
        <Input
          ref={amountInputRef}
          value={editingCell.value}
          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          inputMode="decimal"
          className="h-8 text-right pr-2"
          placeholder="0.00"
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => startEditing(extra, "amount")}
        className="w-full text-right whitespace-nowrap hover:underline focus:outline-none"
        disabled={isMutating}
      >
        {extra.amount != null
          ? `$${extra.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "-"}
      </button>
    );
  };

  const renderInvoiceCell = (extra: InvoiceExtra) => {
    if (editingCell?.id === extra.id && editingCell.field === "invoice_number") {
      return (
        <Input
          ref={invoiceInputRef}
          value={editingCell.value}
          onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-8"
          placeholder="Invoice #"
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => startEditing(extra, "invoice_number")}
        className="w-full text-left whitespace-nowrap hover:underline focus:outline-none text-muted-foreground"
        disabled={isMutating}
      >
        {extra.invoice_number || "-"}
      </button>
    );
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground w-16">Inv Complete</TableHead>
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Builder / Customer</TableHead>
            <TableHead className="text-muted-foreground">Location</TableHead>
            <TableHead className="text-muted-foreground">Lot</TableHead>
            <TableHead className="text-muted-foreground">Description</TableHead>
            <TableHead className="text-muted-foreground text-right">Amount</TableHead>
            <TableHead className="text-muted-foreground">Invoice #</TableHead>
            <TableHead className="text-muted-foreground w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {extras.map((extra) => (
            <TableRow key={extra.id}>
              <TableCell>
                <Checkbox
                  checked={extra.invoice_complete}
                  onCheckedChange={(checked) => onToggleComplete(extra, !!checked)}
                  disabled={isMutating}
                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {format(new Date(extra.entry_date + "T00:00:00"), "M/d/yyyy")}
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {extra.builder_name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {extra.location_name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {extra.lot_number || "-"}
              </TableCell>
              <TableCell className="max-w-[320px] whitespace-pre-wrap">
                {extra.description}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                {renderAmountCell(extra)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {renderInvoiceCell(extra)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit(extra)}
                    aria-label="Edit extra"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(extra)}
                    aria-label="Delete extra"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
