/**
 * Edit Entry Dialog - Uses shared entry-form architecture
 */

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { useEntryForm } from "./entry-form/useEntryForm";
import { 
  GeneralTab, 
  ConcreteTab, 
  PumpTab, 
  InspectionTab, 
  CrewTab, 
  InvoicingTab 
} from "./entry-form/tabs";
import type { ScheduleEntry } from "@/types/schedule";

interface EditEntryDialogProps {
  entry: ScheduleEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "general" | "concrete" | "pump" | "inspection" | "invoicing" | "crew";
}

export function EditEntryDialog({ entry, open, onOpenChange, defaultTab = "general" }: EditEntryDialogProps) {
  const queryClient = useQueryClient();
  
  const { formData, updateField, loadFromEntry, getUpdatePayload } = useEntryForm();

  // Load form data when entry changes
  useEffect(() => {
    if (entry) {
      loadFromEntry(entry);
    }
  }, [entry, loadFromEntry]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!entry) return;
      const payload = getUpdatePayload();
      const { error } = await supabase
        .from("schedule_entries")
        .update(payload)
        .eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-entries"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-entries"] });
      toast.success("Entry updated");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  if (!entry) return null;

  const projectLabel = [
    entry.projects?.builders?.code || entry.projects?.builders?.name,
    entry.projects?.locations?.name,
    entry.projects?.lot_number,
  ].filter(Boolean).join(" / ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-2xl max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg">
        <DialogHeader>
          <DialogTitle>Edit Entry: {projectLabel}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
          <TabsList className="w-full overflow-x-auto flex flex-nowrap gap-1 pb-1">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="concrete">Concrete</TabsTrigger>
            <TabsTrigger value="pump">Pump</TabsTrigger>
            <TabsTrigger value="inspection">Inspection</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
            <TabsTrigger value="crew">Crew</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="mt-4">
            <GeneralTab 
              formData={formData} 
              updateField={updateField}
              showCrew={false}
            />
          </TabsContent>
          
          <TabsContent value="concrete" className="mt-4">
            <ConcreteTab 
              formData={formData} 
              updateField={updateField}
              showInlineAdd={true}
            />
          </TabsContent>
          
          <TabsContent value="pump" className="mt-4">
            <PumpTab 
              formData={formData} 
              updateField={updateField}
              showInlineAdd={true}
            />
          </TabsContent>
          
          <TabsContent value="inspection" className="mt-4">
            <InspectionTab 
              formData={formData} 
              updateField={updateField}
              showInlineAdd={true}
            />
          </TabsContent>
          
          <TabsContent value="invoicing" className="mt-4">
            <InvoicingTab 
              formData={formData} 
              updateField={updateField}
            />
          </TabsContent>
          
          <TabsContent value="crew" className="mt-4">
            <CrewTab 
              formData={formData} 
              updateField={updateField}
              currentCrewId={entry.crew_id || undefined}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
