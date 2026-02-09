import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import {
  Plus,
  Pencil,
  GripVertical,
  Save,
  ChevronDown,
  ChevronRight,
  Users,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { useOrganization } from "@/hooks/useOrganization";

interface Crew {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  color: string | null;
}

interface CrewMember {
  id: string;
  name: string;
  crew_id: string | null;
  is_active: boolean;
}

function SortableCrewRow({
  crew,
  index,
  members,
  expandedId,
  onToggleExpand,
  onEditCrew,
  onToggleCrewActive,
  onEditMember,
  onToggleMemberActive,
  onDeleteMember,
  onAddMember,
}: {
  crew: Crew;
  index: number;
  members: CrewMember[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onEditCrew: (crew: Crew) => void;
  onToggleCrewActive: (id: string, isActive: boolean) => void;
  onEditMember: (member: CrewMember) => void;
  onDeleteMember: (member: CrewMember) => void;
  onToggleMemberActive: (id: string, isActive: boolean) => void;
  onAddMember: (crewId: string) => void;
}) {
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

  const isExpanded = expandedId === crew.id;
  const crewMembers = members.filter((m) => m.crew_id === crew.id);

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(crew.id)}>
        <div
          className={`flex items-center gap-2 px-3 py-2 border-b border-border ${
            isDragging ? "bg-muted" : "hover:bg-muted/50"
          } ${!crew.is_active ? "opacity-60" : ""}`}
        >
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Expand Toggle */}
          <CollapsibleTrigger asChild>
            <button className="p-1 hover:bg-muted rounded">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>

          {/* Position */}
          <span className="w-8 text-center text-sm text-muted-foreground">
            {index + 1}
          </span>

          {/* Color Indicator & Crew Name */}
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: crew.color || "#6b7280" }}
              title={crew.color ? `Color: ${crew.color}` : "No color set"}
            />
            <span className="font-medium text-foreground">
              {crew.name}
              {!crew.is_active && (
                <span className="ml-2 text-xs text-muted-foreground">(Inactive)</span>
              )}
            </span>
          </div>

          {/* Member Count */}
          <span className="flex items-center gap-1 text-sm text-muted-foreground mr-2">
            <Users className="w-3 h-3" />
            {crewMembers.length}
          </span>

          {/* Active Toggle */}
          <Switch
            checked={crew.is_active}
            onCheckedChange={(checked) => onToggleCrewActive(crew.id, checked)}
          />

          {/* Edit Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditCrew(crew)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="bg-muted/30 border-b border-border">
            {/* Members List */}
            {crewMembers.length === 0 ? (
              <div className="px-12 py-3 text-sm text-muted-foreground">
                No members in this crew
              </div>
            ) : (
              crewMembers.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-2 px-12 py-2 border-b border-border/50 last:border-b-0 ${
                    !member.is_active ? "opacity-60" : ""
                  }`}
                >
                  <span className="flex-1 text-sm text-foreground">
                    {member.name}
                    {!member.is_active && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Inactive)
                      </span>
                    )}
                  </span>
                  <Switch
                    checked={member.is_active}
                    onCheckedChange={(checked) =>
                      onToggleMemberActive(member.id, checked)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditMember(member)}
                    className="text-muted-foreground hover:text-foreground h-8 w-8"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteMember(member)}
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}

            {/* Add Member Button */}
            <div className="px-12 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddMember(crew.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Member
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function CrewsManagement() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderedCrews, setOrderedCrews] = useState<Crew[]>([]);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);

  // Crew dialog state
  const [crewDialogOpen, setCrewDialogOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [crewName, setCrewName] = useState("");
  const [crewColor, setCrewColor] = useState<string>("");

  // Member dialog state
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CrewMember | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberCrewId, setMemberCrewId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<CrewMember | null>(null);

  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch crews
  const { isLoading: crewsLoading } = useQuery({
    queryKey: ["crews-management", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, display_order, is_active, color")
        .eq("organization_id", organizationId)
        .order("display_order")
        .order("name");
      if (error) throw error;

      // Sort crews: by display_order first, then numbers first, then alphabetical
      const sorted = [...(data as Crew[])].sort((a, b) => {
        if (a.display_order !== 0 || b.display_order !== 0) {
          if (a.display_order !== b.display_order) {
            return a.display_order - b.display_order;
          }
        }
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
    enabled: !!organizationId,
  });

  // Fetch crew members
  const { data: members = [] } = useQuery({
    queryKey: ["crew-members-management", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crew_members")
        .select("id, name, crew_id, is_active")
        .eq("organization_id", organizationId)
        .order("name");
      if (error) throw error;
      return data as CrewMember[];
    },
    enabled: !!organizationId,
  });

  // Mutations
  const saveOrderMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["crews-all"] });
      queryClient.invalidateQueries({ queryKey: ["crews-management"] });
      setHasOrderChanges(false);
      toast.success("Crew order saved");
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const createCrewMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!organizationId) throw new Error("No organization found");
      const maxOrder = orderedCrews.length > 0 
        ? Math.max(...orderedCrews.map(c => c.display_order)) + 1 
        : 1;
      const { error } = await supabase
        .from("crews")
        .insert({ organization_id: organizationId, name, display_order: maxOrder });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews-management"] });
      toast.success("Crew created");
      closeCrewDialog();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const updateCrewMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string | null }) => {
      const { error } = await supabase.from("crews").update({ name, color }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews-management"] });
      queryClient.invalidateQueries({ queryKey: ["crews-with-colors"] });
      toast.success("Crew updated");
      closeCrewDialog();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const toggleCrewActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("crews").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crews-management"] });
      queryClient.invalidateQueries({ queryKey: ["crews-all"] });
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async ({ name, crew_id }: { name: string; crew_id: string | null }) => {
      if (!organizationId) throw new Error("No organization found");
      const { error } = await supabase.from("crew_members").insert({ organization_id: organizationId, name, crew_id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-members-management"] });
      toast.success("Crew member created");
      closeMemberDialog();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("crew_members").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-members-management"] });
      toast.success("Crew member updated");
      closeMemberDialog();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const toggleMemberActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("crew_members").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-members-management"] });
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crew_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-members-management"] });
      toast.success("Crew member deleted");
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  // Handlers
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedCrews((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasOrderChanges(true);
    }
  };

  const handleSaveOrder = () => {
    const updates = orderedCrews.map((crew, index) => ({
      id: crew.id,
      display_order: index + 1,
    }));
    saveOrderMutation.mutate(updates);
  };

  const openCrewDialog = (crew?: Crew) => {
    if (crew) {
      setEditingCrew(crew);
      setCrewName(crew.name);
      setCrewColor(crew.color || "");
    } else {
      setEditingCrew(null);
      setCrewName("");
      setCrewColor("");
    }
    setCrewDialogOpen(true);
  };

  const closeCrewDialog = () => {
    setCrewDialogOpen(false);
    setEditingCrew(null);
    setCrewName("");
    setCrewColor("");
  };

  const handleCrewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const colorValue = crewColor.trim() || null;
    if (editingCrew) {
      updateCrewMutation.mutate({ id: editingCrew.id, name: crewName, color: colorValue });
    } else {
      createCrewMutation.mutate(crewName);
    }
  };

  const openMemberDialog = (member?: CrewMember, crewId?: string) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.name);
      setMemberCrewId(member.crew_id);
    } else {
      setEditingMember(null);
      setMemberName("");
      setMemberCrewId(crewId || null);
    }
    setMemberDialogOpen(true);
  };

  const closeMemberDialog = () => {
    setMemberDialogOpen(false);
    setEditingMember(null);
    setMemberName("");
    setMemberCrewId(null);
  };

  const handleMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, name: memberName });
    } else {
      createMemberMutation.mutate({ name: memberName, crew_id: memberCrewId });
    }
  };

  if (crewsLoading) {
    return <div className="text-muted-foreground p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Crews</h3>
          <p className="text-sm text-muted-foreground">
            Drag to reorder crews. Click a row to manage crew members.
          </p>
        </div>
        <div className="flex gap-2">
          {hasOrderChanges && (
            <Button
              onClick={handleSaveOrder}
              disabled={saveOrderMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Order
            </Button>
          )}
          <Button onClick={() => openCrewDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Crew
          </Button>
        </div>
      </div>

      {/* Crews Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header Row */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
          <span className="w-8"></span>
          <span className="w-8"></span>
          <span className="w-8 text-center">#</span>
          <span className="flex-1">Crew Name</span>
          <span className="w-12"></span>
          <span className="w-12">Active</span>
          <span className="w-10"></span>
        </div>

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
              <SortableCrewRow
                key={crew.id}
                crew={crew}
                index={index}
                members={members}
                expandedId={expandedId}
                onToggleExpand={(id) =>
                  setExpandedId(expandedId === id ? null : id)
                }
                onEditCrew={openCrewDialog}
                onToggleCrewActive={(id, isActive) =>
                  toggleCrewActiveMutation.mutate({ id, is_active: isActive })
                }
                onEditMember={(member) => openMemberDialog(member)}
                onDeleteMember={(member) => {
                  setMemberToDelete(member);
                  setDeleteConfirmOpen(true);
                }}
                onToggleMemberActive={(id, isActive) =>
                  toggleMemberActiveMutation.mutate({ id, is_active: isActive })
                }
                onAddMember={(crewId) => openMemberDialog(undefined, crewId)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {orderedCrews.length === 0 && (
          <div className="text-muted-foreground text-center py-8">
            No crews yet. Click "Add Crew" to create one.
          </div>
        )}
      </div>

      {/* Crew Dialog */}
      <Dialog open={crewDialogOpen} onOpenChange={setCrewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCrew ? "Edit" : "Add"} Crew</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrewSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Crew Name</Label>
              <Input
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
                required
                placeholder="Enter crew name"
              />
            </div>
            {editingCrew && (
              <div className="space-y-2">
                <Label>Calendar Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={crewColor || "#3b82f6"}
                    onChange={(e) => setCrewColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                    title="Choose crew color"
                  />
                  <Input
                    value={crewColor}
                    onChange={(e) => setCrewColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                  {crewColor && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCrewColor("")}
                      className="text-muted-foreground"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Color used in calendar view. Leave empty for auto-generated color.
                </p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={createCrewMutation.isPending || updateCrewMutation.isPending}
            >
              {editingCrew ? "Update" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit" : "Add"} Crew Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Member Name</Label>
              <Input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                required
                placeholder="Enter member name"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createMemberMutation.isPending || updateMemberMutation.isPending}
            >
              {editingMember ? "Update" : "Add Member"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Crew Member"
        description={`Are you sure you want to delete "${memberToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (memberToDelete) {
            deleteMemberMutation.mutate(memberToDelete.id);
          }
        }}
        variant="destructive"
      />
    </div>
  );
}
