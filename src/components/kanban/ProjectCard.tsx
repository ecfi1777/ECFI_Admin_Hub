import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, MapPin, Home, Archive } from "lucide-react";

export interface KanbanProject {
  id: string;
  lot_number: string;
  status_id: string | null;
  builders: { name: string; code: string | null } | null;
  locations: { name: string } | null;
}

interface ProjectCardProps {
  project: KanbanProject;
  onClick: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  isDragOverlay?: boolean;
  isMobile?: boolean;
}

export function ProjectCard({ project, onClick, onArchive, isDragOverlay, isMobile = false }: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: project.id,
    data: { type: "project", project },
    disabled: isMobile,
  });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Card
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      onClick={() => onClick(project.id)}
      className={`p-3 border-border bg-card hover:bg-accent/50 transition-colors ${
        isMobile ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${isDragging && !isDragOverlay ? "shadow-lg ring-2 ring-primary/30" : ""}`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground min-w-0">
            <Building className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate">
              {project.builders?.code || project.builders?.name || "No Builder"}
            </span>
          </div>
          {onArchive && !isDragOverlay && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onArchive(project.id);
              }}
              title="Archive project"
            >
              <Archive className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{project.locations?.name || "No Location"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <Home className="w-3 h-3 flex-shrink-0" />
          <span>Lot {project.lot_number}</span>
        </div>
      </div>
    </Card>
  );
}
