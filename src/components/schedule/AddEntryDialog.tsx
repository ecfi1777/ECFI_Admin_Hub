/**
 * Add Entry Dialog - Thin wrapper using shared entry-form architecture
 */

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { useActiveProjects, usePhases } from "@/hooks/useReferenceData";
import { useEntryForm } from "./entry-form/useEntryForm";
import { GeneralTab, ConcreteTab, StoneTab, PumpTab, InspectionTab } from "./entry-form/tabs";

export interface PrefilledProject {
  id: string;
  builder?: string;
  location?: string;
  lot_number: string;
}

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCrewId?: string | null;
  defaultDate: string;
  prefilledProject?: PrefilledProject | null;
  showDatePicker?: boolean;
  onSuccess?: () => void;
}

export function AddEntryDialog({ open, onOpenChange, defaultCrewId, defaultDate, prefilledProject, showDatePicker, onSuccess }: AddEntryDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    defaultDate ? new Date(defaultDate + "T12:00:00") : undefined
  );

  // Reset selected date when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(defaultDate ? new Date(defaultDate + "T12:00:00") : undefined);
    }
  }, [open, defaultDate]);
  
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const { data: projects = [] } = useActiveProjects();
  const { data: phases = [] } = usePhases();

  // Use shared form hook with default crew if provided
  const { formData, updateField, resetForm, getInsertPayload } = useEntryForm({
    initialValues: { crew_id: defaultCrewId || "" }
  });

  // Sync prefilled project when dialog opens
  useEffect(() => {
    if (open && prefilledProject) {
      setProjectId(prefilledProject.id);
    }
  }, [open, prefilledProject]);

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

  const effectiveDate = showDatePicker && selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : defaultDate;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization found");
      
      const payload = getInsertPayload();
      const { error } = await supabase.from("schedule_entries").insert({
        organization_id: organizationId,
        scheduled_date: effectiveDate,
        project_id: formData.did_not_work ? null : (projectId || null),
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateScheduleQueries(queryClient);
      toast.success("Schedule entry added");
      handleReset();
      onOpenChange(false);
      onSuccess?.();
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
    if (showDatePicker && !selectedDate) {
      toast.error("Please select a scheduled date");
      return;
    }
    if (formData.did_not_work) {
      if (!formData.not_working_reason.trim()) {
        toast.error("Please enter a reason why the crew did not work");
        return;
      }
      if (!formData.crew_id) {
        toast.error("Please select a crew");
        return;
      }
    } else if (!formData.crew_id) {
      toast.error("Please select a crew");
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
          {/* Date picker when opened from Project Details */}
          {showDatePicker && (
            <div className="space-y-2">
              <Label>Scheduled Date <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Did not work checkbox */}
          <div className="flex items-center space-x-2 p-3 rounded-md border border-border bg-muted/30">
            <Checkbox
              id="did_not_work"
              checked={formData.did_not_work}
              onCheckedChange={(checked) => {
                updateField("did_not_work", !!checked);
                if (checked) {
                  setProjectId("");
                  setProjectSearch("");
                }
              }}
            />
            <Label htmlFor="did_not_work" className="text-sm font-medium cursor-pointer">
              Crew did not work today
            </Label>
          </div>

          {/* Reason field when did not work */}
          {formData.did_not_work && (
            <div className="space-y-2">
              <Label>Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={formData.not_working_reason}
                onChange={(e) => updateField("not_working_reason", e.target.value)}
                placeholder="e.g., Rain delay, Equipment breakdown..."
                rows={2}
              />
            </div>
          )}

          {/* Project Search - hidden when did_not_work */}
          {!formData.did_not_work && (
            <div className="space-y-2">
              <Label>Project</Label>
              {prefilledProject ? (
                <div className="bg-muted border border-border rounded-md px-3 py-2 text-sm text-muted-foreground">
                  {prefilledProject.builder || "No Builder"} - {prefilledProject.location || "No Location"} - {prefilledProject.lot_number}
                </div>
              ) : (
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
              )}
            </div>
          )}

          {/* Crew selector - always shown (needed for did_not_work too) */}
          {formData.did_not_work && (
            <div className="space-y-4">
              <GeneralTab 
                formData={formData} 
                updateField={updateField}
                showCrew={true}
                hideNonCrewFields={true}
              />
            </div>
          )}

          {/* Tabs using shared components - hidden when did_not_work */}
          {!formData.did_not_work && (() => {
            const isPrepSlabs = (() => {
              if (!formData.phase_id) return false;
              const phase = phases.find(p => p.id === formData.phase_id);
              return phase?.name === "Prep Slabs";
            })();
            const materialTabLabel = isPrepSlabs ? "Stone" : "Concrete";
            const materialTabValue = isPrepSlabs ? "stone" : "concrete";

            return (
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="w-full overflow-x-auto flex flex-nowrap gap-1 pb-1">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value={materialTabValue}>{materialTabLabel}</TabsTrigger>
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

                {isPrepSlabs ? (
                  <TabsContent value="stone" className="mt-4">
                    <StoneTab 
                      formData={formData} 
                      updateField={updateField}
                      showInlineAdd={false}
                    />
                  </TabsContent>
                ) : (
                  <TabsContent value="concrete" className="mt-4">
                    <ConcreteTab 
                      formData={formData} 
                      updateField={updateField}
                      showInlineAdd={false}
                    />
                  </TabsContent>
                )}

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
            );
          })()}

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
