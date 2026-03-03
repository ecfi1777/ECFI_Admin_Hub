import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { invalidateScheduleQueries } from "@/lib/queryHelpers";
import type { ScheduleEntry } from "@/types/schedule";

interface CancelDialogProps {
  entry: ScheduleEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelDialog({ entry, open, onOpenChange }: CancelDialogProps) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!entry) return;
      const { error } = await supabase
        .from("schedule_entries")
        .update({
          is_cancelled: true,
          cancellation_reason: reason,
        })
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
      toast.success("Entry cancelled");
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      toast.error("Please enter a cancellation reason");
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
          <DialogTitle>Cancel Job</DialogTitle>
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
              placeholder="e.g., Job postponed indefinitely, Customer cancelled..."
              rows={3}
            />
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
            {mutation.isPending ? "Cancelling..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
