import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VendorInvoiceRowData, VendorTypeFilter } from "./types";
import { VendorInvoiceRow } from "./VendorInvoiceRow";

interface VendorInvoiceTableProps {
  rows: VendorInvoiceRowData[];
  typeFilter: VendorTypeFilter;
  isMobile: boolean;
  isLoading: boolean;
}

export function VendorInvoiceTable({
  rows,
  typeFilter,
  isMobile,
  isLoading,
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
          />
        ))}
      </div>
    );
  }

  /* ─── Desktop: table ─── */
  const showTypeCol = typeFilter === "all";
  const showInvoiceCol = typeFilter === "all" || typeFilter !== "crew";
  const showYardsCol =
    typeFilter === "all" || typeFilter === "concrete" || typeFilter === "crew";
  const showAmountCol = typeFilter === "all" || typeFilter !== "crew";

  const vendorLabel: Record<VendorTypeFilter, string> = {
    all: "Vendor/Crew",
    concrete: "Supplier",
    pump: "Pump Vendor",
    inspection: "Inspector",
    crew: "Crew",
  };

  const yardsLabel = typeFilter === "crew" ? "Crew Yards" : "Yards Billed";

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
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
                <TableHead className="text-muted-foreground w-16">
                  Save
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
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
