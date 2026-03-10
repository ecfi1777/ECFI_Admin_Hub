import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ReferenceItem {
  id: string;
  name: string;
  code?: string | null;
  display_order: number;
  is_active: boolean;
  pl_section?: string | null;
  phase_type?: string | null;
}

const PL_SECTION_CONFIG: Record<string, { label: string; badge: string; variant: string }> = {
  footings_walls: { label: "Footings & Walls", badge: "F&W", variant: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  slab: { label: "Slab", badge: "Slab", variant: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  both: { label: "Both", badge: "Both", variant: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  overhead: { label: "Overhead / Other", badge: "OH", variant: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
};

const PHASE_TYPE_CONFIG: Record<string, { label: string; badge: string; variant: string }> = {
  footing: { label: "Footing Pour", badge: "FTG", variant: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  wall: { label: "Wall Pour", badge: "WALL", variant: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  slab: { label: "Slab Pour", badge: "SLAB", variant: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  other: { label: "Other", badge: "OTHER", variant: "bg-muted text-muted-foreground" },
};

interface SortableReferenceRowProps {
  item: ReferenceItem;
  index: number;
  hasCode: boolean;
  hasPlSection?: boolean;
  tableName?: string;
  onEdit: (item: ReferenceItem) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function SortableReferenceRow({
  item,
  index,
  hasCode,
  hasPlSection = false,
  tableName,
  onEdit,
  onToggleActive,
}: SortableReferenceRowProps) {
  const queryClient = useQueryClient();
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

  const plConfig = item.pl_section ? PL_SECTION_CONFIG[item.pl_section] : null;
  const ptConfig = item.phase_type ? PHASE_TYPE_CONFIG[item.phase_type] : null;

  const handlePlSectionChange = async (value: string) => {
    const newValue = value === "__unset__" ? null : value;
    const { error } = await supabase
      .from("phases")
      .update({ pl_section: newValue } as any)
      .eq("id", item.id);
    if (error) {
      toast.error("Failed to update phase");
    } else {
      toast.success("Phase updated");
      queryClient.invalidateQueries({ queryKey: [tableName] });
    }
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

      {/* Name & Code & PL Badge */}
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
        {hasPlSection && (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            plConfig ? plConfig.variant : "bg-muted text-muted-foreground"
          }`}>
            {plConfig ? plConfig.badge : "Unset"}
          </span>
        )}
      </div>

      {/* P&L Section Select */}
      {hasPlSection && (
        <Select
          value={item.pl_section || "__unset__"}
          onValueChange={handlePlSectionChange}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">— Not set —</SelectItem>
            <SelectItem value="footings_walls">Footings & Walls</SelectItem>
            <SelectItem value="slab">Slab</SelectItem>
            <SelectItem value="both">Both</SelectItem>
            <SelectItem value="overhead">Overhead / Other</SelectItem>
          </SelectContent>
        </Select>
      )}

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