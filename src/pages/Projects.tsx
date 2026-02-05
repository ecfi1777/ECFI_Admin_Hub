import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Search, Paperclip, X, FileText, ExternalLink } from "lucide-react";
import { AddProjectDialog } from "@/components/projects/AddProjectDialog";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";
import { useToast } from "@/hooks/use-toast";

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
  builders: { id: string; name: string; code: string | null } | null;
  locations: { id: string; name: string } | null;
  project_statuses: { id: string; name: string } | null;
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          builders(id, name, code),
          locations(id, name),
          project_statuses(id, name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  // Fetch all documents to show attachment indicator and list
  const { data: projectDocuments = [] } = useQuery({
    queryKey: ["project-documents-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("id, project_id, file_name, file_path, category")
        .order("category");
      if (error) throw error;
      return data;
    },
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
      toast({ title: "Failed to open file", description: error.message, variant: "destructive" });
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

  const { data: builders = [] } = useQuery({
    queryKey: ["builders-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builders")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["statuses-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_statuses")
        .select("id, name")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const filteredProjects = projects.filter((project) => {
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

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "Upcoming":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "Ready to Start":
        return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
      case "In Progress":
        return "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30";
      case "Ready to Invoice":
        return "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "Invoice Complete - Archive":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleRowClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsDetailsOpen(true);
  };

  const handleEditFromDetails = () => {
    setIsDetailsOpen(false);
    setIsEditOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage all your jobs and projects</p>
          </div>
          <AddProjectDialog
            builders={builders}
            locations={locations}
            statuses={statuses}
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
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
              <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                <SelectTrigger className="w-40">
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
                <SelectTrigger className="w-44">
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
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {isLoading ? (
              <div className="text-muted-foreground text-center py-12">Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-muted-foreground text-center py-12">No projects found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Builder</TableHead>
                    <TableHead className="text-muted-foreground">Location</TableHead>
                    <TableHead className="text-muted-foreground">Lot #</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                    <TableHead className="text-muted-foreground w-16 text-center">Docs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(project.id)}
                    >
                      <TableCell className="text-foreground font-medium">
                        {project.builders?.code || project.builders?.name || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.locations?.name || "-"}
                      </TableCell>
                      <TableCell className="text-primary font-medium">
                        {project.lot_number}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(project.project_statuses?.name)}
                        >
                          {project.project_statuses?.name || "No Status"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(project.created_at), "M/d/yyyy")}
                      </TableCell>
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
        onEdit={handleEditFromDetails}
      />

      {/* Edit Project Dialog */}
      <EditProjectDialog
        project={selectedProject}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        builders={builders}
        locations={locations}
        statuses={statuses}
      />
    </AppLayout>
  );
}