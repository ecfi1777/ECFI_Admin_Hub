import { format, parseISO } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCrewColor, getContrastTextColor } from "@/lib/crewColors";
import { cn } from "@/lib/utils";
import type { UpcomingWorkItem } from "./types";

interface HorizonPanelProps {
  items: UpcomingWorkItem[];
  canManage: boolean;
  onEdit: (item: UpcomingWorkItem) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function HorizonPanel({ items, canManage, onEdit, onDelete, onAdd }: HorizonPanelProps) {
  const grouped = items.reduce<Record<string, UpcomingWorkItem[]>>((acc, item) => {
    const key = item.work_date ? format(parseISO(item.work_date), "MMMM yyyy").toUpperCase() : "__NONE__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const monthKeys = Object.keys(grouped).filter((k) => k !== "__NONE__").sort();
  const noDateItems = grouped["__NONE__"] || [];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">On the Horizon — Organized by Start Date</h3>
        {canManage && (
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add upcoming item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">
          No upcoming items on the horizon.
        </div>
      ) : (
        <div className="space-y-4">
          {monthKeys.map((month) => (
            <div key={month}>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {month}
              </h4>
              <div className="space-y-2">
                {grouped[month].map((item) => (
                  <HorizonRow
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}

          {noDateItems.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                No date set
              </h4>
              <div className="space-y-2">
                {noDateItems.map((item) => (
                  <HorizonRow
                    key={item.id}
                    item={item}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HorizonRow({
  item,
  canManage,
  onEdit,
  onDelete,
}: {
  item: UpcomingWorkItem;
  canManage: boolean;
  onEdit: (item: UpcomingWorkItem) => void;
  onDelete: (id: string) => void;
}) {
  const crew = item.crews;
  const crewColor = crew ? getCrewColor(crew) : null;
  const crewTextColor = crewColor ? getContrastTextColor(crewColor) : undefined;
  const phaseName = item.phases?.name || item.phase_custom || "Unknown phase";

  return (
    <div className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/40">
      {item.work_date ? (
        <span className="shrink-0 rounded bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          {format(parseISO(item.work_date), "MMM d")}
        </span>
      ) : (
        <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
          TBD
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">{phaseName}</span>
          {crew ? (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: crewColor || "#64748b", color: crewTextColor }}
            >
              {crew.name}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              No crew
            </span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm">{item.description}</p>
      </div>

      {canManage && (
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
