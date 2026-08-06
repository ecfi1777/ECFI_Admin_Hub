import { format, parseISO } from "date-fns";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCrewColor, getContrastTextColor } from "@/lib/crewColors";
import type { UpcomingWorkItem } from "./types";

interface NeedsEntryTabProps {
  items: UpcomingWorkItem[];
  canManage: boolean;
  onMarkEntered: (id: string) => void;
}

export function NeedsEntryTab({ items, canManage, onMarkEntered }: NeedsEntryTabProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-12 text-center">
        <p className="text-sm font-medium">All caught up</p>
        <p className="text-xs text-muted-foreground">
          Every completed job is in the main schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Completed jobs stay listed here until someone enters them in the main schedule and checks them off.
          Checking off removes them from this list only — the card remains on the board, marked complete.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Phase</th>
              <th className="px-4 py-2 font-medium">Crew</th>
              <th className="px-4 py-2 font-medium">Job description</th>
              <th className="px-4 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const crew = item.crews;
              const crewColor = crew ? getCrewColor(crew) : null;
              const crewTextColor = crewColor ? getContrastTextColor(crewColor) : undefined;
              const phaseName = item.phases?.name || item.phase_custom || "Unknown phase";

              return (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {item.work_date ? format(parseISO(item.work_date), "MM/dd/yyyy") : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium">
                      {phaseName}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {crew ? (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: crewColor || "#64748b", color: crewTextColor }}
                      >
                        {crew.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No crew</span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-2">
                    <p className="whitespace-pre-wrap">{item.description}</p>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canManage ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => onMarkEntered(item.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Added to main schedule
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
