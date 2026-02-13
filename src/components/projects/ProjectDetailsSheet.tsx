import { useState, useCallback } from "react";
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
import { Pencil, ExternalLink, MapPin, FileText, Building, Home, Download, Archive, ArchiveRestore, Trash2, RotateCcw, CalendarPlus } from "lucide-react";
import { AddEntryDialog, type PrefilledProject } from "@/components/schedule/AddEntryDialog";
import { ProjectScheduleHistory } from "./ProjectScheduleHistory";
import { ProjectDocuments } from "./ProjectDocuments";
import { EditProjectDialog } from "./EditProjectDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { generateProjectPdf } from "@/lib/generateProjectPdf";
import { toast } from "sonner";
import { getStatusColor } from "@/lib/statusColors";
import { invalidateProjectQueries as invalidateAllProjectQueries } from "@/lib/queryHelpers";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useBuilders, useLocations, useProjectStatuses } from "@/hooks/useReferenceData";

interface ProjectDetailsSheetProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const KANBAN_STATUSES = ["Upcoming", "Ready to Start", "In Progress", "Complete"];

export function ProjectDetailsSheet({
  projectId,
  isOpen,
  onClose,
}: ProjectDetailsSheetProps) {
  const [editProject, setEditProject] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  const { organizationId } = useOrganization();
  const { canManage, isOwner } = useUserRole();
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
      invalidateAllProjectQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (archive: boolean) => {
      if (!projectId) return;
      const { error } = await supabase
        .from("projects")
        .update({ is_archived: archive } as any)
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_, archive) => {
      invalidateAllProjectQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success(archive ? "Project archived" : "Project unarchived");
    },
    onError: () => {
      toast.error("Failed to update project");
    },
  });

  const invalidateProjectQueries = () => {
    invalidateAllProjectQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };

  const softDeleteMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project ID");
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", projectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidateProjectQueries();
      onClose();
      toast.success("Project deleted. It can be restored within 90 days.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete project: ${err.message}`);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project ID");
      const { error, data, count } = await supabase
        .from("projects")
        .update({ deleted_at: null })
        .eq("id", projectId)
        .select();
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error("No rows updated — you may not have permission");
    },
    onSuccess: () => {
      invalidateProjectQueries();
      onClose();
      toast.success("Project restored successfully.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to restore project: ${err.message}`);
    },
  });

  const handleStatusChange = (value: string) => {
    statusUpdateMutation.mutate(value);
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

  const isDeleted = !!(project as any)?.deleted_at;

  if (!projectId && !editProject) return null;

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
                      {canManage && !isDeleted && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onClose();
                              setEditProject(project);
                            }}
                            className="text-slate-400 hover:text-white h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAddEntry(true)}
                            className="text-slate-400 hover:text-white h-8 w-8 p-0"
                            title="Add schedule entry"
                          >
                            <CalendarPlus className="w-4 h-4" />
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveMutation.mutate(!(project as any).is_archived)}
                            className="text-slate-400 hover:text-white h-8 w-8 p-0"
                            title={(project as any).is_archived ? "Unarchive project" : "Archive project"}
                          >
                            {(project as any).is_archived ? (
                              <ArchiveRestore className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(true)}
                              className="text-slate-400 hover:text-white h-8 w-8 p-0"
                              title="Delete project"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
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
                    <div className="flex items-center gap-1.5">
                      {isDeleted && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                          Deleted
                        </Badge>
                      )}
                      {(project as any).is_archived && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                          Archived
                        </Badge>
                      )}
                      {project.project_statuses && (
                        <Badge
                          variant="outline"
                          className={getStatusColor(project.project_statuses.name)}
                        >
                          {project.project_statuses.name}
                        </Badge>
                      )}
                    </div>
                    {canManage && !isDeleted && (
                      <Select
                        value={project.status_id}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger className="w-[160px] h-8 bg-slate-700 border-slate-600 text-slate-300 text-xs">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {kanbanStatuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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

                {/* Restore button for owners viewing deleted projects */}
                {isOwner && isDeleted && (
                  <div className="border-t border-slate-700 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRestoreConfirm(true)}
                      className="border-emerald-600 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-300"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restore Project
                    </Button>
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
                  <ProjectScheduleHistory projectId={projectId} readOnly={!canManage || isDeleted} />
                </TabsContent>
                <TabsContent value="documents" className="mt-4">
                  <ProjectDocuments projectId={projectId} readOnly={!canManage || isDeleted} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-slate-400 text-center py-12">Project not found</div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Project"
        description={
          <>
            This will delete <strong>{[project?.builders?.name, project?.locations?.name, project?.lot_number].filter(Boolean).join(" - ")}</strong> and hide it from all users. The project and all its schedule entries and documents will be permanently removed after 90 days. You can restore it from the Projects page before then.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          softDeleteMutation.mutate();
        }}
        isLoading={softDeleteMutation.isPending}
      />

      {/* Restore confirmation */}
      <ConfirmDialog
        open={showRestoreConfirm}
        onOpenChange={setShowRestoreConfirm}
        title="Restore Project"
        description="Restore this project? It will become visible to all users again."
        confirmLabel="Restore"
        variant="default"
        onConfirm={() => {
          setShowRestoreConfirm(false);
          restoreMutation.mutate();
        }}
        isLoading={restoreMutation.isPending}
      />

      {!!editProject && (
        <EditProjectDialog
          project={editProject}
          isOpen={!!editProject}
          onClose={() => {
            const pid = editProject?.id;
            setEditProject(null);
            invalidateAllProjectQueries(queryClient);
            queryClient.invalidateQueries({ queryKey: ["project", pid] });
          }}
          builders={builders}
          locations={locations}
          statuses={statuses}
        />
      )}

      {project && (
        <AddEntryDialog
          open={showAddEntry}
          onOpenChange={setShowAddEntry}
          defaultDate={new Date().toISOString().split("T")[0]}
          prefilledProject={{
            id: project.id,
            builder: project.builders?.code || project.builders?.name || undefined,
            location: project.locations?.name || undefined,
            lot_number: project.lot_number,
          }}
          onSuccess={() => {
            invalidateProjectQueries();
          }}
        />
      )}
    </>
  );
}