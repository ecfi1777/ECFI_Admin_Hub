import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Paperclip, X, FileText, ExternalLink, Archive, ArchiveRestore } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AddProjectDialog } from "@/components/projects/AddProjectDialog";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useBuilders, useLocations, useProjectStatuses } from "@/hooks/useReferenceData";
import { getStatusColor } from "@/lib/statusColors";
import { invalidateProjectQueries } from "@/lib/queryHelpers";

interface Project {
  id: string;
  lot_number: string;
  notes: string | null;
  created_at: string;
  builder_id: string | null;
  location_id: string | null;
  status_id: string | null;
  full_address: string | null;
  county: string | null;
  permit_number: string | null;
  authorization_numbers: string | null;
  wall_height: string | null;
  basement_type: string | null;
  google_drive_url: string | null;
  is_archived: boolean;
  deleted_at: string | null;
  builders: { id: string; name: string; code: string | null } | null;
  locations: { id: string; name: string } | null;
  project_statuses: { id: string; name: string } | null;
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { organizationId } = useOrganization();
  const { canManage, isOwner } = useUserRole();
  const queryClient = useQueryClient();

  // Active projects query (deleted_at IS NULL enforced by RLS)
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          builders(id, name, code),
          locations(id, name),
          project_statuses(id, name)
        `)
        .eq("organization_id", organizationId)
        .is("deleted_at" as any, null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!organizationId,
  });

  // Deleted projects query (only for owners, deleted_at IS NOT NULL)
  const { data: deletedProjects = [], isLoading: isLoadingDeleted } = useQuery({
    queryKey: ["deleted-projects", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          builders(id, name, code),
          locations(id, name),
          project_statuses(id, name)
        `)
        .eq("organization_id", organizationId)
        .not("deleted_at" as any, "is", null)
        .order("deleted_at" as any, { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!organizationId && isOwner && showDeleted,
  });

  // Fetch all documents to show attachment indicator and list
  const { data: projectDocuments = [] } = useQuery({
    queryKey: ["project-documents-all", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("project_documents")
        .select("id, project_id, file_name, file_path, category")
        .eq("organization_id", organizationId)
        .order("category");
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Group documents by project ID
  const documentsByProject = projectDocuments.reduce((acc, doc) => {
    if (!acc[doc.project_id]) {
      acc[doc.project_id] = [];
    }
    acc[doc.project_id].push(doc);
    return acc;
  }, {} as Record<string, typeof projectDocuments>);

  const openDocument = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("project-documents")
      .createSignedUrl(filePath, 3600);
    
    if (error) {
      toast.error(`Failed to open file: ${error.message}`);
      return;
    }
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const hasFiltersApplied =
    searchQuery !== "" ||
    filterBuilder !== "all" ||
    filterLocation !== "all" ||
    filterStatus !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterBuilder("all");
    setFilterLocation("all");
    setFilterStatus("all");
  };

  // Use shared reference data hooks
  const { data: builders = [] } = useBuilders();
  const { data: locations = [] } = useLocations();
  const { data: statuses = [] } = useProjectStatuses();

  const archiveMutation = useMutation({
    mutationFn: async ({ projectId, archive }: { projectId: string; archive: boolean }) => {
      const { error } = await supabase
        .from("projects")
        .update({ is_archived: archive } as any)
        .eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: (_, { archive }) => {
      invalidateProjectQueries(queryClient);
      toast.success(archive ? "Project archived" : "Project unarchived");
    },
    onError: () => {
      toast.error("Failed to update project");
    },
  });

  // Choose which list to display
  const displayProjects = showDeleted ? deletedProjects : projects;

  const filteredProjects = displayProjects.filter((project) => {
    // Hide archived unless toggle is on (only relevant for active projects)
    if (!showDeleted && !includeArchived && (project as any).is_archived) {
      return false;
    }

    const matchesSearch =
      searchQuery === "" ||
      project.lot_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.builders?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.locations?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.full_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.permit_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBuilder = filterBuilder === "all" || project.builders?.id === filterBuilder;
    const matchesLocation = filterLocation === "all" || project.locations?.id === filterLocation;
    const matchesStatus = filterStatus === "all" || project.project_statuses?.id === filterStatus;

    return matchesSearch && matchesBuilder && matchesLocation && matchesStatus;
  });

  const handleRowClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsDetailsOpen(true);
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt + "T00:00:00");
    const purgeDate = new Date(deletedDate);
    purgeDate.setDate(purgeDate.getDate() + 90);
    return Math.max(0, differenceInDays(purgeDate, new Date()));
  };

  return (
    <AppLayout>
      <div className="p-3 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {showDeleted ? "Deleted Projects" : "Projects"}
            </h1>
            <p className="text-muted-foreground">
              {showDeleted
                ? "Projects pending permanent deletion"
                : "Manage all your jobs and projects"}
            </p>
          </div>
          {canManage && !showDeleted && (
            <AddProjectDialog
              builders={builders}
              locations={locations}
              statuses={statuses}
            />
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="w-full md:flex-1 md:min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {!showDeleted && (
                <>
                  <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="All Builders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Builders</SelectItem>
                      {builders.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterLocation} onValueChange={setFilterLocation}>
                    <SelectTrigger className="w-full md:w-44">
                      <SelectValue placeholder="All Locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="include-archived"
                      checked={includeArchived}
                      onCheckedChange={(checked) => setIncludeArchived(checked === true)}
                    />
                    <Label htmlFor="include-archived" className="text-sm text-muted-foreground cursor-pointer">
                      Include Archived
                    </Label>
                  </div>
                </>
              )}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-deleted"
                    checked={showDeleted}
                    onCheckedChange={(checked) => setShowDeleted(checked === true)}
                  />
                  <Label htmlFor="show-deleted" className="text-sm text-destructive cursor-pointer">
                    Show Deleted
                  </Label>
                </div>
              )}
              {hasFiltersApplied && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            {(showDeleted ? isLoadingDeleted : isLoading) ? (
              <div className="text-muted-foreground text-center py-12">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-muted-foreground text-center py-12">
                {showDeleted ? "No deleted projects" : "No projects found"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Builder</TableHead>
                    <TableHead className="text-muted-foreground">Location</TableHead>
                    <TableHead className="text-muted-foreground">Lot #</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">
                      {showDeleted ? "Deleted" : "Created"}
                    </TableHead>
                    {showDeleted && (
                      <TableHead className="text-muted-foreground">Auto-Purge</TableHead>
                    )}
                    {!showDeleted && (
                      <TableHead className="text-muted-foreground w-16 text-center">Docs</TableHead>
                    )}
                    {canManage && !showDeleted && <TableHead className="text-muted-foreground w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className={`cursor-pointer ${showDeleted ? "opacity-60" : ""}`}
                      onClick={() => handleRowClick(project.id)}
                    >
                      <TableCell className={`font-medium ${showDeleted ? "text-muted-foreground" : "text-foreground"}`}>
                        {project.builders?.code || project.builders?.name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.locations?.name || "-"}
                      </TableCell>
                      <TableCell className={`font-medium ${showDeleted ? "text-muted-foreground" : "text-primary"}`}>
                        {project.lot_number}
                      </TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1.5">
                           {showDeleted && (
                             <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                               Deleted
                             </Badge>
                           )}
                           {!showDeleted && (
                             <Badge
                               variant="outline"
                               className={getStatusColor(project.project_statuses?.name)}
                             >
                               {project.project_statuses?.name || "No Status"}
                             </Badge>
                           )}
                           {!showDeleted && (project as any).is_archived && (
                             <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                               Archived
                             </Badge>
                           )}
                         </div>
                       </TableCell>
                      <TableCell className="text-muted-foreground">
                        {showDeleted && project.deleted_at
                          ? format(new Date(project.deleted_at), "M/d/yyyy")
                          : format(new Date(project.created_at), "M/d/yyyy")}
                      </TableCell>
                      {showDeleted && (
                        <TableCell className="text-muted-foreground text-sm">
                          {project.deleted_at && (
                            <span>
                              {getDaysRemaining(project.deleted_at)} days remaining
                            </span>
                          )}
                        </TableCell>
                      )}
                      {!showDeleted && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {documentsByProject[project.id]?.length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Paperclip className="w-4 h-4 text-primary" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-64 p-3"
                                align="end"
                              >
                                <div className="space-y-2">
                                  <h4 className="font-medium text-foreground text-sm">
                                    Attached Documents ({documentsByProject[project.id].length})
                                  </h4>
                                  <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {documentsByProject[project.id].map((doc) => (
                                      <button
                                        key={doc.id}
                                        onClick={() => openDocument(doc.file_path)}
                                        className="flex items-center gap-2 text-sm text-muted-foreground py-1 w-full hover:text-primary transition-colors text-left group"
                                      >
                                        <FileText className="w-3 h-3 flex-shrink-0 group-hover:text-primary" />
                                        <span className="truncate flex-1">{doc.file_name}</span>
                                        <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </TableCell>
                      )}
                      {canManage && !showDeleted && (
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          {(project as any).is_archived ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => archiveMutation.mutate({ projectId: project.id, archive: false })}
                              title="Unarchive project"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => archiveMutation.mutate({ projectId: project.id, archive: true })}
                              title="Archive project"
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                     </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Details Sheet */}
      <ProjectDetailsSheet
        projectId={selectedProjectId}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </AppLayout>
  );
}