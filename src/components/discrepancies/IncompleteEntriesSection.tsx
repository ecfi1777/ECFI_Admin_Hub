import { memo, useState } from "react";
import { format } from "date-fns";
import { AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
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

interface IncompleteEntriesSectionProps {
  entries: ScheduleEntry[];
  onEditEntry: (entry: ScheduleEntry) => void;
}

export const IncompleteEntriesSection = memo(function IncompleteEntriesSection({
  entries,
  onEditEntry,
}: IncompleteEntriesSectionProps) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card border border-border rounded-lg overflow-hidden mb-6">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-2">
              {open ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-foreground">
                Incomplete Entries ({entries.length})
              </span>
              <span className="text-xs text-muted-foreground">
                — missing yards data needed for discrepancy calculations
              </span>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="overflow-x-auto border-t border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Builder</TableHead>
                  <TableHead className="text-muted-foreground">Location</TableHead>
                  <TableHead className="text-muted-foreground">Lot #</TableHead>
                  <TableHead className="text-muted-foreground">Phase</TableHead>
                  <TableHead className="text-muted-foreground">Crew</TableHead>
                  <TableHead className="text-muted-foreground">Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const missingCrew = entry.crew_yards_poured == null;
                  const missingSupplier = entry.ready_mix_yards_billed == null;
                  const missingLabel =
                    missingCrew && missingSupplier
                      ? "Both"
                      : missingCrew
                      ? "Crew Yards"
                      : "Supplier Yards";

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
                        {entry.projects?.builders?.code ||
                          entry.projects?.builders?.name ||
                          "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.projects?.locations?.name || "-"}
                      </TableCell>
                      <TableCell className="text-primary font-medium">
                        {entry.projects?.lot_number || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.phases?.name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.crews?.name || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                        >
                          {missingLabel}
                        </Badge>
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
