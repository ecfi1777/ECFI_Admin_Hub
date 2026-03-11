import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { invalidateScheduleQueries } from "@/lib/queryHelpers";
import { useOrganization } from "@/hooks/useOrganization";
import type { ScheduleEntry } from "@/types/schedule";

interface CancelRescheduleDialogProps {
  entry: ScheduleEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRescheduled?: (newDate: string) => void;
}

export function CancelRescheduleDialog({ entry, open, onOpenChange, onRescheduled }: CancelRescheduleDialogProps) {
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entry || !newDate || !organizationId) return;
      const originalDate = entry.scheduled_date;
      const newDateStr = format(newDate, "yyyy-MM-dd");

      // 1. Mark current entry as cancelled
      const { error: updateError } = await supabase
        .from("schedule_entries")
        .update({
          is_cancelled: true,
          cancellation_reason: reason,
          rescheduled_to_date: newDateStr,
        })
        .eq("id", entry.id);
      if (updateError) throw updateError;

      // 2. Create duplicate entry on the new date
      const { error: insertError } = await supabase
        .from("schedule_entries")
        .insert({
          organization_id: organizationId,
          scheduled_date: newDateStr,
          project_id: entry.project_id,
          crew_id: entry.crew_id,
          phase_id: entry.phase_id,
          start_time: entry.start_time,
          order_status: entry.order_status,
          notes: entry.notes,
          supplier_id: entry.supplier_id,
          concrete_mix_id: entry.concrete_mix_id,
          qty_ordered: entry.qty_ordered,
          pump_vendor_id: entry.pump_vendor_id,
          inspection_type_id: entry.inspection_type_id,
          inspector_id: entry.inspector_id,
          additive_hot_water: entry.additive_hot_water,
          additive_1_percent_he: entry.additive_1_percent_he,
          additive_2_percent_he: entry.additive_2_percent_he,
          rescheduled_from_date: originalDate,
          rescheduled_from_entry_id: entry.id,
          cancellation_reason: reason,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
      toast.success("Entry cancelled and rescheduled");
      if (onRescheduled && newDate) {
        onRescheduled(format(newDate, "yyyy-MM-dd"));
      }
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleClose = () => {
    setReason("");
    setNewDate(undefined);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("Please enter a cancellation reason");
      return;
    }
    if (!newDate) {
      toast.error("Please select a new date");
      return;
    }
    if (
      currentScheduledDate &&
      newDate &&
      newDate.getFullYear() === currentScheduledDate.getFullYear() &&
      newDate.getMonth() === currentScheduledDate.getMonth() &&
      newDate.getDate() === currentScheduledDate.getDate()
    ) {
      toast.error(
        "Please select a different date — this job is already scheduled for that day"
      );
      return;
    }
    mutation.mutate();
  };

  if (!entry) return null;

  const projectLabel = [
    entry.projects?.builders?.code || entry.projects?.builders?.name,
    entry.projects?.locations?.name,
    entry.projects?.lot_number,
  ].filter(Boolean).join(" / ") || "Entry";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel & Reschedule</DialogTitle>
          <DialogDescription>
            {projectLabel} — {entry.scheduled_date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason for Cancellation <span className="text-destructive">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Inspector did not show up, Rain delay, Material not delivered..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Reschedule to <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, "PPP") : "Pick a new date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mutation.isPending}
            variant="destructive"
          >
            {mutation.isPending ? "Rescheduling..." : "Cancel & Reschedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
