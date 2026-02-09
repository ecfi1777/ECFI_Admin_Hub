import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { GripVertical, Save } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Crew {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

function SortableRow({ crew, index }: { crew: Crew; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: crew.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`border-border ${isDragging ? "bg-muted" : ""}`}
    >
      <TableCell className="py-2 w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="text-foreground font-medium py-2">
        {crew.name}
      </TableCell>
      <TableCell className="text-muted-foreground py-2 w-20 text-center">
        {index + 1}
      </TableCell>
    </TableRow>
  );
}

export function CrewOrderTable() {
  const [orderedCrews, setOrderedCrews] = useState<Crew[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { isLoading } = useQuery({
    queryKey: ["crews-all-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, display_order, is_active")
        .eq("is_active", true)
        .order("display_order")
        .order("name");
      if (error) throw error;

      // Sort crews: by display_order first, then numbers first, then alphabetical
      const sorted = [...(data as Crew[])].sort((a, b) => {
        // First sort by display_order if set (non-zero)
        if (a.display_order !== 0 || b.display_order !== 0) {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
        }

        // Check if names start with numbers
        const aIsNumber = /^\d/.test(a.name);
        const bIsNumber = /^\d/.test(b.name);

        if (aIsNumber && !bIsNumber) return -1;
        if (!aIsNumber && bIsNumber) return 1;

        if (aIsNumber && bIsNumber) {
          const aNum = parseInt(a.name.match(/^\d+/)?.[0] || "0", 10);
          const bNum = parseInt(b.name.match(/^\d+/)?.[0] || "0", 10);
          return aNum - bNum;
        }

        return a.name.localeCompare(b.name);
      });

      setOrderedCrews(sorted);
      return sorted;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from("crews")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews"] });
      queryClient.invalidateQueries({ queryKey: ["crews-active"] });
      queryClient.invalidateQueries({ queryKey: ["crews-all-order"] });
      setHasChanges(false);
      toast.success("Crew order saved");
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedCrews((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    const updates = orderedCrews.map((crew, index) => ({
      id: crew.id,
      display_order: index + 1,
    }));
    updateMutation.mutate(updates);
  };

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Crew Display Order</h3>
          <p className="text-sm text-muted-foreground">
            Drag crews to reorder them. The order shown here is how they'll appear on the schedule.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending || !hasChanges}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Order
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="text-muted-foreground w-10"></TableHead>
              <TableHead className="text-muted-foreground">Crew Name</TableHead>
              <TableHead className="text-muted-foreground w-20 text-center">Position</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedCrews.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {orderedCrews.map((crew, index) => (
                  <SortableRow key={crew.id} crew={crew} index={index} />
                ))}
              </SortableContext>
            </DndContext>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
