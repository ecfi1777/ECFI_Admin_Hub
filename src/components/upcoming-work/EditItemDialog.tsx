import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { UpcomingWorkItem, UpcomingWorkFormValues } from "./types";

const OTHER_VALUE = "__OTHER__";

interface Phase {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

interface Crew {
  id: string;
  name: string;
  is_active: boolean;
  display_order: number;
}

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: UpcomingWorkItem | null;
  initialDate: string | null;
  phases: Phase[];
  crews: Crew[];
  onSave: (values: UpcomingWorkFormValues) => void;
  onDelete?: (id: string) => void;
}

export function EditItemDialog({
  open,
  onOpenChange,
  item,
  initialDate,
  phases,
  crews,
  onSave,
  onDelete,
}: EditItemDialogProps) {
  const [workDate, setWorkDate] = useState<string>("");
  const [crewId, setCrewId] = useState<string>("");
  const [phaseId, setPhaseId] = useState<string>("");
  const [phaseCustom, setPhaseCustom] = useState<string>("");
  const [isOtherPhase, setIsOtherPhase] = useState(false);
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<"scheduled" | "complete">("scheduled");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (item) {
      setWorkDate(item.work_date || "");
      setCrewId(item.crew_id || "");
      setPhaseId(item.phase_id || "");
      setPhaseCustom(item.phase_custom || "");
      setIsOtherPhase(!!item.phase_custom && !item.phase_id);
      setDescription(item.description || "");
      setStatus(item.status);
    } else {
      setWorkDate(initialDate || "");
      setCrewId("");
      setPhaseId("");
      setPhaseCustom("");
      setIsOtherPhase(false);
      setDescription("");
      setStatus("scheduled");
    }
    setErrors({});
  }, [open, item, initialDate]);

  const activePhases = phases
    .filter((p) => p.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  const activeCrews = crews
    .filter((c) => c.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  const phaseSelectValue = isOtherPhase ? OTHER_VALUE : phaseId;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!description.trim()) {
      next.description = "Description is required";
    }
    if (isOtherPhase) {
      if (!phaseCustom.trim()) next.phase = "Enter a custom phase";
    } else if (!phaseId) {
      next.phase = "Phase is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const values: UpcomingWorkFormValues = {
      work_date: workDate,
      crew_id: crewId,
      phase_id: isOtherPhase ? "" : phaseId,
      phase_custom: isOtherPhase ? phaseCustom.trim() : "",
      description: description.trim(),
      status: workDate ? status : "scheduled",
    };
    onSave(values);
    onOpenChange(false);
  };


  const selectedDate = workDate ? parseISO(workDate) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? "Edit job" : "Add job"}</DialogTitle>
          <DialogDescription>
            {item ? "Update the planning item details below." : "Add a new item to the planning board."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !workDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {workDate ? format(parseISO(workDate), "MM/dd/yyyy") : "Optional — leave blank for horizon"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setWorkDate(date ? format(date, "yyyy-MM-dd") : "")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Optional — leave blank to keep this on the horizon without a day.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crew">Crew</Label>
            <select
              id="crew"
              value={crewId}
              onChange={(e) => setCrewId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Unassigned</option>
              {activeCrews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phase">Phase</Label>
            <select
              id="phase"
              value={phaseSelectValue}
              onChange={(e) => {
                const value = e.target.value;
                setPhaseId(value === OTHER_VALUE ? "" : value);
                if (value !== OTHER_VALUE) setPhaseCustom("");
              }}
              className={cn(
                "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                errors.phase ? "border-destructive" : "border-input"
              )}
            >
              <option value="">Select a phase...</option>
              {activePhases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
              <option value={OTHER_VALUE}>Other — type my own…</option>
            </select>
            {phaseSelectValue === OTHER_VALUE && (
              <Input
                value={phaseCustom}
                onChange={(e) => setPhaseCustom(e.target.value)}
                placeholder="Enter custom phase"
                className={errors.phase ? "border-destructive" : ""}
              />
            )}
            {errors.phase && <p className="text-xs text-destructive">{errors.phase}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Job details..."
              rows={4}
              className={errors.description ? "border-destructive" : ""}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          {workDate && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="status">Status</Label>
                <p className="text-xs text-muted-foreground">
                  Mark this job as complete when ready.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs", status === "scheduled" ? "font-medium" : "text-muted-foreground")}>
                  Scheduled
                </span>
                <Switch
                  id="status"
                  checked={status === "complete"}
                  onCheckedChange={(checked) => setStatus(checked ? "complete" : "scheduled")}
                />
                <span className={cn("text-xs", status === "complete" ? "font-medium" : "text-muted-foreground")}>
                  Complete
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {item && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={() => {
                  onDelete(item.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {item ? "Save changes" : "Add job"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
