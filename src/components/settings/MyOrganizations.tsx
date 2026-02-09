import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, Check, LogOut, GripVertical, Save } from "lucide-react";
import { JoinOrganizationDialog } from "./JoinOrganizationDialog";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { useQueryClient } from "@tanstack/react-query";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

interface SortableOrgRowProps {
  membership: {
    id: string;
    organization_id: string;
    role: string;
    created_at: string;
    display_order: number;
    organizations: { id: string; name: string };
  };
  index: number;
  isActive: boolean;
  isFirst: boolean;
  onSwitch: (orgId: string) => void;
  onLeave: (orgId: string, orgName: string) => void;
}

function SortableOrgRow({ membership, index, isActive, isFirst, onSwitch, onLeave }: SortableOrgRowProps) {
  const isOwner = membership.role === "owner";
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: membership.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center justify-between p-3 rounded-lg border transition-colors
        ${isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}
        ${isDragging ? "z-50 shadow-lg" : ""}
      `}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Position */}
        <span className="w-6 text-center text-sm text-muted-foreground">
          {index + 1}
        </span>

        <div
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => !isActive && onSwitch(membership.organization_id)}
        >
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center shrink-0
            ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}
          `}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {membership.organizations.name}
              </span>
              {isActive && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              )}
              {isFirst && (
                <Badge variant="outline" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs capitalize">
                {membership.role}
              </Badge>
              <span>·</span>
              <span>
                Joined {format(new Date(membership.created_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {isActive && (
          <Check className="w-5 h-5 text-primary" />
        )}
        {!isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onLeave(membership.organization_id, membership.organizations.name);
            }}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function MyOrganizations() {
  const { allOrganizations, organizationId, switchOrganization, isLoading, saveOrganizationOrder } = useOrganization();
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null);
  const [leaveOrgName, setLeaveOrgName] = useState<string>("");
  const [isLeaving, setIsLeaving] = useState(false);
  const [orderedOrgs, setOrderedOrgs] = useState(allOrganizations);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const queryClient = useQueryClient();

  // Sync local state with fetched data
  useEffect(() => {
    setOrderedOrgs(allOrganizations);
    setHasOrderChanges(false);
  }, [allOrganizations]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedOrgs.findIndex(m => m.id === active.id);
    const newIndex = orderedOrgs.findIndex(m => m.id === over.id);
    const newOrder = arrayMove(orderedOrgs, oldIndex, newIndex);
    setOrderedOrgs(newOrder);
    setHasOrderChanges(true);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      await saveOrganizationOrder(orderedOrgs.map(m => m.id));
      setHasOrderChanges(false);
      toast.success("Organization order saved. The first organization is your default on sign-in.");
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, "Save order"));
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleLeaveOrganization = async () => {
    if (!leaveOrgId) return;

    setIsLeaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("organization_memberships")
        .delete()
        .eq("organization_id", leaveOrgId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(`You have left "${leaveOrgName}".`);

      if (leaveOrgId === organizationId) {
        const remaining = allOrganizations.filter(o => o.organization_id !== leaveOrgId);
        if (remaining.length > 0) {
          switchOrganization(remaining[0].organization_id);
        } else {
          window.location.href = "/onboarding";
        }
      }

      queryClient.invalidateQueries({ queryKey: ["organization-memberships"] });
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Leave org error:", error);
      toast.error(getUserFriendlyError(error, "Leave organization"));
    } finally {
      setIsLeaving(false);
      setLeaveOrgId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <CardTitle>My Organizations</CardTitle>
            </div>
            {hasOrderChanges && (
              <Button size="sm" onClick={handleSaveOrder} disabled={isSavingOrder}>
                <Save className="w-4 h-4 mr-2" />
                {isSavingOrder ? "Saving..." : "Save Order"}
              </Button>
            )}
          </div>
          <CardDescription>
            Drag to reorder. The first organization will load by default on sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderedOrgs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You don't belong to any organizations yet.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={orderedOrgs.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedOrgs.map((membership, index) => (
                    <SortableOrgRow
                      key={membership.id}
                      membership={membership}
                      index={index}
                      isActive={membership.organization_id === organizationId}
                      isFirst={index === 0}
                      onSwitch={switchOrganization}
                      onLeave={(orgId, orgName) => {
                        setLeaveOrgId(orgId);
                        setLeaveOrgName(orgName);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setJoinOpen(true)}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Organization
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(true)}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </div>
        </CardContent>
      </Card>

      <JoinOrganizationDialog open={joinOpen} onOpenChange={setJoinOpen} />
      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
      
      <ConfirmDialog
        open={!!leaveOrgId}
        onOpenChange={(open) => !open && setLeaveOrgId(null)}
        title="Leave Organization?"
        description={`Are you sure you want to leave "${leaveOrgName}"? You will lose access to all data in this organization. You can rejoin later with an invite code.`}
        confirmLabel="Leave Organization"
        onConfirm={handleLeaveOrganization}
        variant="destructive"
        isLoading={isLeaving}
      />
    </>
  );
}