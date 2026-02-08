import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useBuilders, useLocations, useProjectStatuses } from "@/hooks/useReferenceData";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { ProjectCard, KanbanProject } from "@/components/kanban/ProjectCard";
import { ProjectDetailsSheet } from "@/components/projects/ProjectDetailsSheet";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";

const COLLAPSE_STORAGE_KEY = "ecfi_kanban_collapsed";
const KANBAN_STATUSES = ["No Status", "Upcoming", "Ready to Start", "In Progress", "Complete"];

function getInitialCollapsed(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export default function Kanban() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBuilder, setFilterBuilder] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed);
  const [activeProject, setActiveProject] = useState<KanbanProject | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const { data: builders = [] } = useBuilders();
  const { data: locations = [] } = useLocations();
  const { data: statuses = [] } = useProjectStatuses();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Fetch projects (exclude Archived)
  const { data: projects = [] } = useQuery({
    queryKey: ["kanban-projects", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, lot_number, status_id,
          builders(name, code),
          locations(name),
          project_statuses(id, name)
        `)
        .eq("organization_id", organizationId);
      if (error) throw error;
      // Filter out Archived
      return (data as (KanbanProject & { project_statuses: { id: string; name: string } | null })[])
        .filter((p) => p.project_statuses?.name !== "Archived");
    },
    enabled: !!organizationId,
  });

  // Status lookup map
  const statusMap = useMemo(() => {
    const map: Record<string, string> = {};
    statuses.forEach((s) => { map[s.name] = s.id; });
    return map;
  }, [statuses]);

  // Filter projects
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.builders?.name?.toLowerCase().includes(q) ||
        p.builders?.code?.toLowerCase().includes(q) ||
        p.locations?.name?.toLowerCase().includes(q) ||
        p.lot_number.toLowerCase().includes(q);
      const matchesBuilder =
        filterBuilder === "all" || p.builders?.name === builders.find((b) => b.id === filterBuilder)?.name;
      const matchesLocation =
        filterLocation === "all" || p.locations?.name === locations.find((l) => l.id === filterLocation)?.name;
      return matchesSearch && matchesBuilder && matchesLocation;
    });
  }, [projects, searchQuery, filterBuilder, filterLocation, builders, locations]);

  // Group projects into columns, sorted by builder name
  const columns = useMemo(() => {
    const groups: Record<string, KanbanProject[]> = {};
    KANBAN_STATUSES.forEach((s) => { groups[s] = []; });

    filtered.forEach((p) => {
      const statusName =
        (p as any).project_statuses?.name || "No Status";
      const col = KANBAN_STATUSES.includes(statusName) ? statusName : "No Status";
      groups[col].push(p);
    });

    // Sort each column by builder name
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) =>
        (a.builders?.name || "").localeCompare(b.builders?.name || "")
      )
    );
    return groups;
  }, [filtered]);

  const toggleCollapse = useCallback((col: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [col]: !prev[col] };
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const proj = projects.find((p) => p.id === event.active.id);
    setActiveProject(proj || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveProject(null);
    const { active, over } = event;
    if (!over) return;

    const projectId = active.id as string;
    const targetColumn = over.id as string;

    // Determine new status_id
    const newStatusId = targetColumn === "No Status" ? null : statusMap[targetColumn] || null;

    // Check if status actually changed
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const currentStatusName = (project as any).project_statuses?.name || "No Status";
    if (currentStatusName === targetColumn) return;

    // Optimistic update
    queryClient.setQueryData(
      ["kanban-projects", organizationId],
      (old: any[]) =>
        old?.map((p) =>
          p.id === projectId
            ? {
                ...p,
                status_id: newStatusId,
                project_statuses: newStatusId
                  ? { id: newStatusId, name: targetColumn }
                  : null,
              }
            : p
        )
    );

    const { error } = await supabase
      .from("projects")
      .update({ status_id: newStatusId })
      .eq("id", projectId);

    if (error) {
      toast.error("Failed to update project status");
      queryClient.invalidateQueries({ queryKey: ["kanban-projects", organizationId] });
    } else {
      toast.success(`Moved to ${targetColumn}`);
      // Also invalidate the projects list for the Projects page
      queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
    }
  };

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setIsDetailsOpen(true);
  };

  const handleEditFromDetails = () => {
    setIsDetailsOpen(false);
    setIsEditOpen(true);
  };

  // Fetch full project data for the edit dialog
  const { data: fullSelectedProject = null } = useQuery({
    queryKey: ["project", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", selectedProjectId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId && isEditOpen,
  });

  return (
    <AppLayout>
      <div className="p-6 h-full flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">Kanban</h1>
          <p className="text-muted-foreground">Drag projects between columns to update status</p>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[180px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by builder, location, lot..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>
              <Select value={filterBuilder} onValueChange={setFilterBuilder}>
                <SelectTrigger className="w-40 h-9">
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
                <SelectTrigger className="w-40 h-9">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full pb-4">
              {KANBAN_STATUSES.map((status) => (
                <KanbanColumn
                  key={status}
                  id={status}
                  title={status}
                  projects={columns[status] || []}
                  isCollapsed={!!collapsed[status]}
                  onToggleCollapse={() => toggleCollapse(status)}
                  onProjectClick={handleProjectClick}
                />
              ))}
            </div>

            <DragOverlay>
              {activeProject ? (
                <div className="w-[260px]">
                  <ProjectCard
                    project={activeProject}
                    onClick={() => {}}
                    isDragOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <ProjectDetailsSheet
        projectId={selectedProjectId}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={handleEditFromDetails}
      />

      <EditProjectDialog
        project={fullSelectedProject}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["kanban-projects", organizationId] });
        }}
        builders={builders}
        locations={locations}
        statuses={statuses}
      />
    </AppLayout>
  );
}
