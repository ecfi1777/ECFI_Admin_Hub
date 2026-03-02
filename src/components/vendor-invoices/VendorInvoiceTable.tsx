import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { VendorInvoiceRowData, VendorTypeFilter } from "./types";
import { VendorInvoiceRow } from "./VendorInvoiceRow";

interface VendorInvoiceTableProps {
  rows: VendorInvoiceRowData[];
  typeFilter: VendorTypeFilter;
  isMobile: boolean;
  isLoading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
}

export function VendorInvoiceTable({
  rows,
  typeFilter,
  isMobile,
  isLoading,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
}: VendorInvoiceTableProps) {
  if (isLoading) {
    return (
      <div className="text-muted-foreground text-center py-12">Loading...</div>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No entries need vendor data
        </CardContent>
      </Card>
    );
  }

  const hasInspectionRows = rows.some((r) => r.type === "inspection");
  const showCheckboxCol = hasInspectionRows;

  /* ─── Mobile: card list ─── */
  if (isMobile) {
    return (
      <div>
        {rows.map((row) => (
          <VendorInvoiceRow
            key={`${row.entry.id}-${row.type}`}
            row={row}
            typeFilter={typeFilter}
            isMobile
            isSelected={selectedIds.has(row.entry.id)}
            onToggleSelect={onToggleSelect}
            showCheckboxCol={showCheckboxCol}
          />
        ))}
      </div>
    );
  }

  /* ─── Desktop: table ─── */
  const showTypeCol = typeFilter === "all";
  const showInvoiceCol = true;
  const showYardsCol =
    typeFilter === "all" || typeFilter === "concrete" || typeFilter === "stone";
  const showAmountCol = true;

  const vendorLabel: Record<VendorTypeFilter, string> = {
    all: "Vendor",
    concrete: "Supplier",
    stone: "Stone Supplier",
    pump: "Pump Vendor",
    inspection: "Inspector",
  };

  const yardsLabel = typeFilter === "stone" ? "Tons Billed" : "Yards Billed";

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {showCheckboxCol && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={onToggleSelectAll}
                      aria-label="Select all inspection rows"
                    />
                  </TableHead>
                )}
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">
                  Builder · Location · Lot
                </TableHead>
                <TableHead className="text-muted-foreground">Phase</TableHead>
                {showTypeCol && (
                  <TableHead className="text-muted-foreground">Type</TableHead>
                )}
                <TableHead className="text-muted-foreground">
                  {vendorLabel[typeFilter]}
                </TableHead>
                {showInvoiceCol && (
                  <TableHead className="text-muted-foreground">
                    Invoice #
                  </TableHead>
                )}
                {showYardsCol && (
                  <TableHead className="text-muted-foreground">
                    {yardsLabel}
                  </TableHead>
                )}
                {showAmountCol && (
                  <TableHead className="text-muted-foreground">
                    Amount $
                  </TableHead>
                )}
                <TableHead className="text-muted-foreground w-16">Save</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <VendorInvoiceRow
                  key={`${row.entry.id}-${row.type}`}
                  row={row}
                  typeFilter={typeFilter}
                  isMobile={false}
                  isSelected={selectedIds.has(row.entry.id)}
                  onToggleSelect={onToggleSelect}
                  showCheckboxCol={showCheckboxCol}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
