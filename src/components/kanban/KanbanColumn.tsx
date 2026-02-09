import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ProjectCard, KanbanProject } from "./ProjectCard";

interface KanbanColumnProps {
  id: string;
  title: string;
  projects: KanbanProject[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onProjectClick: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  isMobile?: boolean;
}

export function KanbanColumn({
  id,
  title,
  projects,
  isCollapsed,
  onToggleCollapse,
  onProjectClick,
  onArchive,
  isMobile = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: isMobile });

  return (
    <div
      className={`flex flex-col min-w-[85vw] snap-start md:min-w-[260px] ${
        isCollapsed ? "w-12 min-w-[48px]" : "md:w-[280px]"
      } flex-shrink-0 transition-all`}
    >
      {/* Column Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
        <h3 className={`text-sm font-semibold text-foreground ${isCollapsed ? "writing-mode-vertical" : ""}`}>
          {title}
        </h3>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {projects.length}
        </Badge>
      </div>

      {/* Column Body */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className={`flex-1 rounded-lg border border-dashed p-2 space-y-2 min-h-[200px] overflow-y-auto transition-colors ${
            isOver
              ? "border-primary/60 bg-primary/5"
              : "border-border bg-muted/30"
          }`}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={onProjectClick}
              onArchive={onArchive}
              isMobile={isMobile}
            />
          ))}
          {projects.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              No projects
            </div>
          )}
        </div>
      )}
    </div>
  );
}
