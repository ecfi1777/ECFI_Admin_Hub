/**
 * Edit Entry Dialog - Uses shared entry-form architecture
 * Fetches the complete entry by ID on open to ensure all tabs are populated,
 * regardless of which view (Calendar, Schedule, etc.) opens it.
 */

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { invalidateScheduleQueries } from "@/lib/queryHelpers";
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

  // Fetch the complete entry record by ID whenever the dialog opens
  const { data: fullEntry, isLoading: isLoadingEntry } = useQuery({
    queryKey: ["schedule-entry-full", entry?.id, open],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          *,
          projects:project_id (
            id, lot_number, builder_id, location_id, organization_id,
            builders:builder_id ( id, name, code ),
            locations:location_id ( id, name )
          ),
          crews:crew_id ( id, name ),
          phases:phase_id ( id, name ),
          suppliers:supplier_id ( id, name, code ),
          pump_vendors:pump_vendor_id ( id, name, code ),
          inspection_types:inspection_type_id ( id, name ),
          inspectors:inspector_id ( id, name ),
          concrete_mixes:concrete_mix_id ( id, name )
        `)
        .eq("id", entry!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!entry?.id,
    staleTime: 0,
  });

  // Load form data from the freshly fetched full record
  useEffect(() => {
    if (fullEntry) {
      loadFromEntry(fullEntry as unknown as ScheduleEntry);
    }
  }, [fullEntry, loadFromEntry]);

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
      invalidateScheduleQueries(queryClient);
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

  // Use prop for the label (always has enough data for display)
  const projectLabel = [
    entry.projects?.builders?.code || entry.projects?.builders?.name,
    entry.projects?.locations?.name,
    entry.projects?.lot_number,
  ].filter(Boolean).join(" / ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-2xl max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="truncate text-base sm:text-lg">Edit Entry: {projectLabel}</DialogTitle>
        </DialogHeader>
        
        {isLoadingEntry ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
              <TabsList className="w-full overflow-x-auto flex flex-nowrap justify-start gap-1 pb-1">
                <TabsTrigger value="general" className="flex-shrink-0">General</TabsTrigger>
                <TabsTrigger value="concrete" className="flex-shrink-0">Concrete</TabsTrigger>
                <TabsTrigger value="pump" className="flex-shrink-0">Pump</TabsTrigger>
                <TabsTrigger value="inspection" className="flex-shrink-0">Inspection</TabsTrigger>
                <TabsTrigger value="invoicing" className="flex-shrink-0">Invoicing</TabsTrigger>
                <TabsTrigger value="crew" className="flex-shrink-0">Crew</TabsTrigger>
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
                  currentCrewId={(fullEntry as any)?.crew_id || entry.crew_id || undefined}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
