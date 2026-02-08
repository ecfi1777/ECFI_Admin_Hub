import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, ExternalLink, MapPin, FileText, Building, Home, Download } from "lucide-react";
import { ProjectScheduleHistory } from "./ProjectScheduleHistory";
import { ProjectDocuments } from "./ProjectDocuments";
import { EditProjectDialog } from "./EditProjectDialog";
import { generateProjectPdf } from "@/lib/generateProjectPdf";
import { toast } from "sonner";
import { getStatusColor } from "@/lib/statusColors";
import { useOrganization } from "@/hooks/useOrganization";
import { useBuilders, useLocations, useProjectStatuses } from "@/hooks/useReferenceData";

interface ProjectDetailsSheetProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const KANBAN_STATUSES = ["No Status", "Upcoming", "Ready to Start", "In Progress", "Complete"];

export function ProjectDetailsSheet({
  projectId,
  isOpen,
  onClose,
}: ProjectDetailsSheetProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const { data: statuses = [] } = useProjectStatuses();
  const { data: builders = [] } = useBuilders();
  const { data: locations = [] } = useLocations();

  const statusUpdateMutation = useMutation({
    mutationFn: async (newStatusId: string | null) => {
      if (!projectId) return;
      const { error } = await supabase
        .from("projects")
        .update({ status_id: newStatusId })
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban-projects", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const handleStatusChange = (value: string) => {
    const newStatusId = value === "no-status" ? null : value;
    statusUpdateMutation.mutate(newStatusId);
  };

  // Filter statuses to only show Kanban-relevant ones
  const kanbanStatuses = statuses.filter((s) =>
    KANBAN_STATUSES.includes(s.name)
  );

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          builders(id, name, code),
          locations(id, name),
          project_statuses(id, name)
        `)
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Fetch schedule entries for PDF export
  const { data: scheduleEntries = [] } = useQuery({
    queryKey: ["project-schedule-history-pdf", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("schedule_entries")
        .select(`
          id,
          scheduled_date,
          start_time,
          crew_yards_poured,
          crew_notes,
          ready_mix_yards_billed,
          ready_mix_invoice_number,
          ready_mix_invoice_amount,
          concrete_notes,
          pump_invoice_number,
          pump_invoice_amount,
          pump_notes,
          inspection_invoice_number,
          inspection_amount,
          inspection_notes,
          notes,
          to_be_invoiced,
          invoice_complete,
          invoice_number,
          phases(id, name),
          crews(id, name),
          suppliers(id, name, code),
          pump_vendors(id, name, code),
          inspectors(id, name),
          inspection_types(id, name)
        `)
        .eq("project_id", projectId)
        .eq("deleted", false)
        .order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleExportPdf = () => {
    if (!project) return;
    try {
      generateProjectPdf(project, scheduleEntries);
      toast.success("PDF exported successfully");
    } catch (error) {
      toast.error("Error exporting PDF");
    }
  };

  if (!projectId) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="bg-slate-800 border-slate-700 w-full sm:max-w-2xl overflow-y-auto">
          {isLoading ? (
            <div className="text-slate-400 text-center py-12">Loading...</div>
          ) : project ? (
            <>
              <SheetHeader className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-white text-xl flex items-center gap-2">
                      <span className="text-amber-500">{project.lot_number}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditOpen(true)}
                        className="text-slate-400 hover:text-white h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExportPdf}
                        className="text-slate-400 hover:text-white h-8 w-8 p-0"
                        title="Export to PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {project.builders && (
                        <span className="text-slate-300">
                          {project.builders.code || project.builders.name}
                        </span>
                      )}
                      {project.locations && (
                        <>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{project.locations.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {project.project_statuses && (
                      <Badge
                        variant="outline"
                        className={getStatusColor(project.project_statuses.name)}
                      >
                        {project.project_statuses.name}
                      </Badge>
                    )}
                    <Select
                      value={project.status_id || "no-status"}
                      onValueChange={handleStatusChange}
                    >
                      <SelectTrigger className="w-[160px] h-8 bg-slate-700 border-slate-600 text-slate-300 text-xs">
                        <SelectValue placeholder="Move to Phase" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-status">No Status</SelectItem>
                        {kanbanStatuses.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Project Info Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {project.full_address && (
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                      <span className="text-slate-300">{project.full_address}</span>
                    </div>
                  )}
                  {project.county && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">County:</span>
                      <span className="text-slate-300">{project.county}</span>
                    </div>
                  )}
                  {project.permit_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">Permit: {project.permit_number}</span>
                    </div>
                  )}
                  {project.authorization_numbers && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Auth #:</span>
                      <span className="text-slate-300">{project.authorization_numbers}</span>
                    </div>
                  )}
                  {project.wall_height && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">Wall: {project.wall_height}</span>
                    </div>
                  )}
                  {project.basement_type && (
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-300">{project.basement_type}</span>
                    </div>
                  )}
                  {project.google_drive_url && (
                    <div className="col-span-2">
                      <a
                        href={project.google_drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-amber-500 hover:text-amber-400"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Google Drive Folder</span>
                      </a>
                    </div>
                  )}
                </div>

                {project.notes && (
                  <div className="text-slate-400 text-sm border-t border-slate-700 pt-3">
                    {project.notes}
                  </div>
                )}
              </SheetHeader>

              <Tabs defaultValue="history" className="mt-6">
                <TabsList className="bg-slate-700 border-slate-600">
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-slate-600 text-slate-300"
                  >
                    Schedule History
                  </TabsTrigger>
                  <TabsTrigger
                    value="documents"
                    className="data-[state=active]:bg-slate-600 text-slate-300"
                  >
                    Documents
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="mt-4">
                  <ProjectScheduleHistory projectId={projectId} />
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
                  <ProjectDocuments projectId={projectId} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-slate-400 text-center py-12">Project not found</div>
          )}
        </SheetContent>
      </Sheet>

      <EditProjectDialog
        project={project}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["project", projectId] });
          queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
          queryClient.invalidateQueries({ queryKey: ["kanban-projects", organizationId] });
        }}
        builders={builders}
        locations={locations}
        statuses={statuses}
      />
    </>
  );
}
