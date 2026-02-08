import { memo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScheduleEntry } from "@/types/schedule";

interface ProjectDiscrepancyRowProps {
  projectLabel: string;
  entries: ScheduleEntry[];
  totalCrewYards: number;
  totalSupplierYards: number;
  discrepancy: number;
  onEditEntry: (entry: ScheduleEntry) => void;
}

export const ProjectDiscrepancyRow = memo(function ProjectDiscrepancyRow({
  projectLabel,
  entries,
  totalCrewYards,
  totalSupplierYards,
  discrepancy,
  onEditEntry,
}: ProjectDiscrepancyRowProps) {
  const [open, setOpen] = useState(false);
  const absDisc = Math.abs(discrepancy);
  const isMatch = absDisc < 0.05;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <CollapsibleTrigger asChild>
          <button className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 p-3 md:p-4 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-2 shrink-0">
              {open ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="font-semibold text-foreground text-sm md:text-base">
                {projectLabel}
              </span>
            </div>

            <div className="flex items-center gap-3 ml-auto text-xs md:text-sm">
              <span className="text-muted-foreground">
                Crew: <span className="text-foreground font-medium">{totalCrewYards.toFixed(1)}</span>
              </span>
              <span className="text-muted-foreground">
                Supplier: <span className="text-foreground font-medium">{totalSupplierYards.toFixed(1)}</span>
              </span>
              <Badge
                className={
                  isMatch
                    ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"
                    : absDisc > 5
                    ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }
                variant="outline"
              >
                {isMatch ? "Match" : `${discrepancy > 0 ? "+" : ""}${discrepancy.toFixed(1)}`}
              </Badge>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Phase</TableHead>
                  <TableHead className="text-muted-foreground">Crew</TableHead>
                  <TableHead className="text-muted-foreground">Supplier</TableHead>
                  <TableHead className="text-muted-foreground text-right">Crew Yds</TableHead>
                  <TableHead className="text-muted-foreground text-right">Billed Yds</TableHead>
                  <TableHead className="text-muted-foreground text-right">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const crewYds = entry.crew_yards_poured || 0;
                  const billedYds = entry.ready_mix_yards_billed || 0;
                  const diff = crewYds - billedYds;
                  const hasDiff = Math.abs(diff) >= 0.05;

                  return (
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onEditEntry(entry)}
                    >
                      <TableCell className="text-foreground">
                        {format(new Date(entry.scheduled_date + "T00:00:00"), "M/d/yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.phases?.name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.crews?.name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.suppliers?.code || entry.suppliers?.name || "-"}
                      </TableCell>
                      <TableCell className="text-foreground font-medium text-right">
                        {crewYds.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-foreground font-medium text-right">
                        {billedYds.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasDiff ? (
                          <Badge
                            variant="outline"
                            className={
                              diff > 0
                                ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30"
                                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            }
                          >
                            {diff > 0 ? "+" : ""}
                            {diff.toFixed(1)}
                          </Badge>
                        ) : (
                          <span className="text-green-600 dark:text-green-400 text-sm">0.0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
