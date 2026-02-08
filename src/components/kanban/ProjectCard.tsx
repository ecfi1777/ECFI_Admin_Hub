import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Building, MapPin, Home } from "lucide-react";

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
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
    data: { type: "project", project },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(project.id)}
      className={`p-3 cursor-grab active:cursor-grabbing border-border bg-card hover:bg-accent/50 transition-colors ${
        isDragging ? "opacity-50 shadow-lg ring-2 ring-primary/30" : ""
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Building className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate">
            {project.builders?.code || project.builders?.name || "No Builder"}
          </span>
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
