import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface YardsSummaryEntry {
  crew_yards_poured: number | null;
  ready_mix_yards_billed: number | null;
  crews: { name: string } | null;
  suppliers: { name: string } | null;
}

interface YardsSummaryCardsProps {
  entries: YardsSummaryEntry[];
}

export const YardsSummaryCards = memo(function YardsSummaryCards({
  entries,
}: YardsSummaryCardsProps) {
  // Calculate crew totals
  const crewTotals: Record<string, number> = {};
  entries.forEach((entry) => {
    const name = entry.crews?.name || "Unassigned";
    crewTotals[name] = (crewTotals[name] || 0) + (entry.crew_yards_poured || 0);
  });

  // Calculate supplier totals
  const supplierTotals: Record<string, number> = {};
  entries.forEach((entry) => {
    const name = entry.suppliers?.name || "Unknown";
    supplierTotals[name] = (supplierTotals[name] || 0) + (entry.ready_mix_yards_billed || 0);
  });

  // Sort by total descending
  const sortedCrews = Object.entries(crewTotals).sort((a, b) => b[1] - a[1]);
  const sortedSuppliers = Object.entries(supplierTotals).sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Yards by Crew</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedCrews.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data</p>
          ) : (
            <div className="space-y-2">
              {sortedCrews.map(([name, total]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="text-muted-foreground">Crew {name}</span>
                  <span className="text-foreground font-medium">{total.toFixed(1)} yds</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Yards by Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSuppliers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data</p>
          ) : (
            <div className="space-y-2">
              {sortedSuppliers.map(([name, total]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="text-foreground font-medium">{total.toFixed(1)} yds</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
