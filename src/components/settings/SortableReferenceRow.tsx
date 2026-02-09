import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReferenceItem {
  id: string;
  name: string;
  code?: string | null;
  display_order: number;
  is_active: boolean;
}

interface SortableReferenceRowProps {
  item: ReferenceItem;
  index: number;
  hasCode: boolean;
  onEdit: (item: ReferenceItem) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function SortableReferenceRow({
  item,
  index,
  hasCode,
  onEdit,
  onToggleActive,
}: SortableReferenceRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 border-b border-border ${
        isDragging ? "bg-muted" : "hover:bg-muted/50"
      } ${!item.is_active ? "opacity-60" : ""}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Position */}
      <span className="w-8 text-center text-sm text-muted-foreground">
        {index + 1}
      </span>

      {/* Name & Code */}
      <div className="flex items-center gap-2 flex-1">
        <span className="font-medium text-foreground">
          {item.name}
          {!item.is_active && (
            <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
          )}
        </span>
        {hasCode && item.code && (
          <Badge variant="secondary" className="text-xs">
            {item.code}
          </Badge>
        )}
      </div>

      {/* Active Toggle */}
      <Switch
        checked={item.is_active}
        onCheckedChange={(checked) => onToggleActive(item.id, checked)}
      />

      {/* Edit Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(item)}
        className="text-muted-foreground hover:text-foreground"
      >
        <Pencil className="w-4 h-4" />
      </Button>
    </div>
  );
}
