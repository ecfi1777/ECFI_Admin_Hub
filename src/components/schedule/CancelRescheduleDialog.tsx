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
import type { ScheduleEntry } from "@/types/schedule";

interface CancelRescheduleDialogProps {
  entry: ScheduleEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelRescheduleDialog({ entry, open, onOpenChange }: CancelRescheduleDialogProps) {
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entry || !newDate) return;
      const originalDate = entry.scheduled_date;
      const newDateStr = format(newDate, "yyyy-MM-dd");

      const { error } = await supabase
        .from("schedule_entries")
        .update({
          scheduled_date: newDateStr,
          cancellation_reason: reason,
          rescheduled_from_date: originalDate,
        })
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
      toast.success("Entry cancelled and rescheduled");
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
