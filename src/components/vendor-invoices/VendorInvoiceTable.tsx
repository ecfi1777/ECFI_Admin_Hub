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
  showNoCharge: boolean;
  onUndoNoCharge: (id: string) => void;
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
  showNoCharge,
  onUndoNoCharge,
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
          {showNoCharge ? "No entries marked as No Charge" : "No entries need vendor data"}
        </CardContent>
      </Card>
    );
  }

  const hasInspectionRows = rows.some((r) => r.type === "inspection");
  const showCheckboxCol = hasInspectionRows && !showNoCharge;

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
            showNoCharge={showNoCharge}
            onUndoNoCharge={onUndoNoCharge}
          />
        ))}
      </div>
    );
  }

  /* ─── Desktop: table ─── */
  const showTypeCol = typeFilter === "all";
  const showInvoiceCol = typeFilter === "all" || typeFilter !== "crew";
  const showYardsCol =
    typeFilter === "all" || typeFilter === "concrete" || typeFilter === "stone" || typeFilter === "crew";
  const showAmountCol = typeFilter === "all" || typeFilter !== "crew";

  const vendorLabel: Record<VendorTypeFilter, string> = {
    all: "Vendor/Crew",
    concrete: "Supplier",
    stone: "Stone Supplier",
    pump: "Pump Vendor",
    inspection: "Inspector",
    crew: "Crew",
  };

  const yardsLabel = typeFilter === "crew" ? "Crew Yards" : typeFilter === "stone" ? "Tons Billed" : "Yards Billed";

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
                {!showNoCharge && showInvoiceCol && (
                  <TableHead className="text-muted-foreground">
                    Invoice #
                  </TableHead>
                )}
                {!showNoCharge && showYardsCol && (
                  <TableHead className="text-muted-foreground">
                    {yardsLabel}
                  </TableHead>
                )}
                {!showNoCharge && showAmountCol && (
                  <TableHead className="text-muted-foreground">
                    Amount $
                  </TableHead>
                )}
                <TableHead className="text-muted-foreground w-16">
                  {showNoCharge ? "Action" : "Save"}
                </TableHead>
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
                  showNoCharge={showNoCharge}
                  onUndoNoCharge={onUndoNoCharge}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
