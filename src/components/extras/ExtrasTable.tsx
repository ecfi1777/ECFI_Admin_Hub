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
import { Pencil, Trash2 } from "lucide-react";
import { InvoiceExtra } from "./types";

interface ExtrasTableProps {
  extras: InvoiceExtra[];
  isLoading: boolean;
  onToggleComplete: (extra: InvoiceExtra, complete: boolean) => void;
  onEdit: (extra: InvoiceExtra) => void;
  onDelete: (extra: InvoiceExtra) => void;
  isMutating: boolean;
}

export function ExtrasTable({
  extras,
  isLoading,
  onToggleComplete,
  onEdit,
  onDelete,
  isMutating,
}: ExtrasTableProps) {
  if (isLoading) {
    return <div className="text-muted-foreground text-center py-12">Loading...</div>;
  }

  if (extras.length === 0) {
    return <div className="text-muted-foreground text-center py-12">No extras found</div>;
  }

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
                {extra.amount != null
                  ? `$${extra.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {extra.invoice_number || "-"}
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
