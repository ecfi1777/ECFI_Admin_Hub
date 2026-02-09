import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableReferenceRow } from "./SortableReferenceRow";

type TableName =
  | "crews"
  | "builders"
  | "locations"
  | "phases"
  | "project_statuses"
  | "suppliers"
  | "pump_vendors"
  | "inspection_types"
  | "inspectors"
  | "concrete_mixes";

interface ReferenceDataTableProps {
  tableName: TableName;
  displayName: string;
  hasCode?: boolean;
}

interface ReferenceItem {
  id: string;
  name: string;
  code?: string | null;
  display_order: number;
  is_active: boolean;
}

export function ReferenceDataTable({ tableName, displayName, hasCode = false }: ReferenceDataTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [orderedItems, setOrderedItems] = useState<ReferenceItem[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);

  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: items = [], isLoading } = useQuery({
    queryKey: [tableName, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("organization_id", organizationId)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as ReferenceItem[];
    },
    enabled: !!organizationId,
  });

  // Sync fetched items into ordered local state
  useEffect(() => {
    if (items.length > 0 && !hasOrderChanges) {
      setOrderedItems(items);
    }
  }, [items, hasOrderChanges]);

  const createMutation = useMutation({
    mutationFn: async (newItem: Partial<ReferenceItem>) => {
      if (!organizationId) throw new Error("No organization found");
      const maxOrder = orderedItems.length > 0
        ? Math.max(...orderedItems.map((i) => i.display_order)) + 1
        : 1;
      const { error } = await supabase
        .from(tableName)
        .insert([{ ...newItem, display_order: maxOrder, organization_id: organizationId }] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success("Created successfully");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReferenceItem> & { id: string }) => {
      const { error } = await supabase.from(tableName).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success("Updated successfully");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from(tableName).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const saveOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from(tableName)
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      setHasOrderChanges(false);
      toast.success("Order saved");
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const openDialog = (item?: ReferenceItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setCode(item.code || "");
    } else {
      setEditingItem(null);
      setName("");
      setCode("");
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setName("");
    setCode("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const itemData: Partial<ReferenceItem> = { name };
    if (hasCode) itemData.code = code;

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...itemData });
    } else {
      createMutation.mutate(itemData);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
      setHasOrderChanges(true);
    }
  };

  const handleSaveOrder = () => {
    const updates = orderedItems.map((item, index) => ({
      id: item.id,
      display_order: index + 1,
    }));
    saveOrderMutation.mutate(updates);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">{displayName}</CardTitle>
        <div className="flex items-center gap-2">
          {hasOrderChanges && (
            <Button
              onClick={handleSaveOrder}
              disabled={saveOrderMutation.isPending}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Order
            </Button>
          )}
          <Button
            onClick={() => openDialog()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add {displayName.slice(0, -1)}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-muted-foreground text-center py-8">Loading...</div>
        ) : orderedItems.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">No items yet</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedItems.map((item, index) => (
                <SortableReferenceRow
                  key={item.id}
                  item={item}
                  index={index}
                  hasCode={hasCode}
                  onEdit={openDialog}
                  onToggleActive={(id, isActive) =>
                    toggleActiveMutation.mutate({ id, is_active: isActive })
                  }
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add"} {displayName.slice(0, -1)}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {hasCode && (
              <div className="space-y-2">
                <Label>Code (optional)</Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? "Update" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
