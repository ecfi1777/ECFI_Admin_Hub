/**
 * Add Entry Dialog - Thin wrapper using shared entry-form architecture
 */

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { invalidateScheduleQueries } from "@/lib/queryHelpers";
import { Search } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useProjects } from "@/hooks/useReferenceData";
import { useEntryForm } from "./entry-form/useEntryForm";
import { GeneralTab, ConcreteTab, PumpTab, InspectionTab } from "./entry-form/tabs";

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCrewId?: string | null;
  defaultDate: string;
}

export function AddEntryDialog({ open, onOpenChange, defaultCrewId, defaultDate }: AddEntryDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { data: projects = [] } = useProjects();

  // Use shared form hook with default crew if provided
  const { formData, updateField, resetForm, getInsertPayload } = useEntryForm({
    initialValues: { crew_id: defaultCrewId || "" }
  });

  // Update crew when defaultCrewId changes
  useEffect(() => {
    if (defaultCrewId) {
      updateField("crew_id", defaultCrewId);
    }
  }, [defaultCrewId, updateField]);

  // Filter projects based on search term
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    
    const searchLower = projectSearch.toLowerCase();
    return projects.filter((project) => {
      const builderName = project.builders?.name?.toLowerCase() || "";
      const builderCode = project.builders?.code?.toLowerCase() || "";
      const location = project.locations?.name?.toLowerCase() || "";
      const lot = project.lot_number?.toLowerCase() || "";
      
      return (
        builderName.includes(searchLower) ||
        builderCode.includes(searchLower) ||
        location.includes(searchLower) ||
        lot.includes(searchLower)
      );
    });
  }, [projects, projectSearch]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization found");
      
      const payload = getInsertPayload();
      const { error } = await supabase.from("schedule_entries").insert({
        organization_id: organizationId,
        scheduled_date: defaultDate,
        project_id: projectId || null,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
      toast.success("Entry created");
      handleReset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleReset = () => {
    setProjectId("");
    setProjectSearch("");
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      toast.error("Please select a project before adding an entry");
      return;
    }
    createMutation.mutate();
  };

  const handleProjectSelect = (id: string) => {
    setProjectId(id);
    setProjectSearch("");
  };

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-2xl max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg">
        <DialogHeader>
          <DialogTitle>Add Schedule Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Search - AddEntryDialog-specific */}
          <div className="space-y-2">
            <Label>Project <span className="text-destructive">*</span></Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={projectSearch}
                  onChange={(e) => {
                    setProjectSearch(e.target.value);
                    if (projectId) setProjectId("");
                  }}
                  placeholder="Search by builder, location, or lot..."
                  className="pl-9"
                />
              </div>
              
              {/* Search results */}
              {projectSearch.trim() && filteredProjects.length > 0 && !projectId && (
                <div className="bg-muted border border-border rounded-md max-h-48 overflow-y-auto">
                  {filteredProjects.slice(0, 10).map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleProjectSelect(project.id)}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm border-b border-border last:border-b-0"
                    >
                      {project.builders?.code || project.builders?.name || "No Builder"} - {project.locations?.name || "No Location"} - {project.lot_number}
                    </div>
                  ))}
                </div>
              )}
              
              {projectSearch.trim() && filteredProjects.length === 0 && !projectId && (
                <div className="text-muted-foreground text-sm py-2">
                  No projects found matching "{projectSearch}"
                </div>
              )}
              
              {/* Selected project */}
              {selectedProject && (
                <div className="bg-primary/10 border border-primary/30 rounded-md px-3 py-2 text-sm flex justify-between items-center">
                  <span>
                    {selectedProject.builders?.code || selectedProject.builders?.name} - {selectedProject.locations?.name} - {selectedProject.lot_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProjectId("")}
                    className="text-muted-foreground hover:text-foreground ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs using shared components */}
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full overflow-x-auto flex flex-nowrap gap-1 pb-1">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="concrete">Concrete</TabsTrigger>
              <TabsTrigger value="pump">Pump</TabsTrigger>
              <TabsTrigger value="inspection">Inspection</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <GeneralTab 
                formData={formData} 
                updateField={updateField}
                showCrew={true}
              />
            </TabsContent>

            <TabsContent value="concrete" className="mt-4">
              <ConcreteTab 
                formData={formData} 
                updateField={updateField}
                showInlineAdd={false}
              />
            </TabsContent>

            <TabsContent value="pump" className="mt-4">
              <PumpTab 
                formData={formData} 
                updateField={updateField}
                showInlineAdd={false}
              />
            </TabsContent>

            <TabsContent value="inspection" className="mt-4">
              <InspectionTab 
                formData={formData} 
                updateField={updateField}
                showInlineAdd={false}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
