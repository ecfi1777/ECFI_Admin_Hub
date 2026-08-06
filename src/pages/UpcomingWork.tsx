import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useUpcomingWork } from "@/components/upcoming-work/useUpcomingWork";
import { WeekHeader } from "@/components/upcoming-work/WeekHeader";
import { CrewFilter } from "@/components/upcoming-work/CrewFilter";
import { BoardView } from "@/components/upcoming-work/BoardView";
import { SiteNotes } from "@/components/upcoming-work/SiteNotes";
import { HorizonPanel } from "@/components/upcoming-work/HorizonPanel";
import { NeedsEntryTab } from "@/components/upcoming-work/NeedsEntryTab";
import { EditItemDialog } from "@/components/upcoming-work/EditItemDialog";
import type {
  UpcomingWorkItem,
  UpcomingWorkFormValues,
  SelectedCrewFilter,
} from "@/components/upcoming-work/types";

export default function UpcomingWork() {
  const { organizationId } = useOrganization();
  const { canManage } = useUserRole();
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("board");
  const [selectedCrews, setSelectedCrews] = useState<SelectedCrewFilter[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UpcomingWorkItem | null>(null);
  const [dialogInitialDate, setDialogInitialDate] = useState<string | null>(null);

  const monday = startOfWeek(anchorDate, { weekStartsOn: 1 });

  const {
    itemsForWeek,
    horizonItems,
    needsEntryCount,
    needsEntryItems,
    weekNote,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    markComplete,
    markEnteredInMainSchedule,
    saveWeekNote,
    reorderDay,
  } = useUpcomingWork(anchorDate);

  const { data: crews = [] } = useQuery({
    queryKey: ["upcoming-work-crews", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, display_order, is_active, color")
        .eq("organization_id", organizationId)
        .order("display_order");
      if (error) throw error;
      return data as { id: string; name: string; display_order: number; is_active: boolean; color: string | null }[];
    },
    enabled: !!organizationId,
  });

  const { data: phases = [] } = useQuery({
    queryKey: ["upcoming-work-phases", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("phases")
        .select("id, name, display_order, is_active")
        .eq("organization_id", organizationId)
        .order("display_order");
      if (error) throw error;
      return data as { id: string; name: string; display_order: number; is_active: boolean }[];
    },
    enabled: !!organizationId,
  });

  const filteredBoardItems = useMemo(() => {
    if (selectedCrews.length === 0) return itemsForWeek;
    return itemsForWeek.filter((item) => {
      const crewId = item.crew_id;
      return selectedCrews.includes(crewId);
    });
  }, [itemsForWeek, selectedCrews]);

  const filteredHorizonItems = useMemo(() => {
    if (selectedCrews.length === 0) return horizonItems;
    return horizonItems.filter((item) => {
      const crewId = item.crew_id;
      return selectedCrews.includes(crewId);
    });
  }, [horizonItems, selectedCrews]);

  const openAddDialog = (dateStr: string | null = null) => {
    setEditingItem(null);
    setDialogInitialDate(dateStr);
    setDialogOpen(true);
  };

  const openEditDialog = (item: UpcomingWorkItem) => {
    setEditingItem(item);
    setDialogInitialDate(item.work_date);
    setDialogOpen(true);
  };

  const handleSave = (values: UpcomingWorkFormValues) => {
    const payload = {
      work_date: values.work_date || null,
      crew_id: values.crew_id || null,
      phase_id: values.phase_id || null,
      phase_custom: values.phase_custom || null,
      description: values.description,
      status: values.status,
    };

    if (editingItem) {
      const previousDate = editingItem.work_date;
      updateItem.mutate(
        { id: editingItem.id, values: payload },
        {
          onSuccess: () => {
            toast.success("Job updated");
            if (!previousDate && payload.work_date) {
              const weekStart = format(monday, "yyyy-MM-dd");
              const weekEnd = format(addDays(monday, 6), "yyyy-MM-dd");
              const scheduled = payload.work_date >= weekStart && payload.work_date <= weekEnd;
              if (scheduled) {
                toast(`Scheduled for ${payload.work_date}`);
              } else {
                toast(`Added to horizon for ${payload.work_date}`);
              }
            }
          },
        }
      );
    } else {
      createItem.mutate(payload, {
        onSuccess: () => {
          toast.success("Job added");
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteItem.mutate(id, {
      onSuccess: () => toast.success("Job deleted"),
    });
  };

  const handleComplete = (id: string) => {
    markComplete.mutate(id, {
      onSuccess: () => toast.success("Marked complete — added to Needs Schedule Entry"),
    });
  };

  const handleMarkEntered = (id: string) => {
    markEnteredInMainSchedule.mutate(id, {
      onSuccess: () => toast.success("Marked as entered in main schedule"),
    });
  };

  const handleMoveItem = (itemId: string, newDate: string, newDisplayOrder: number) => {
    updateItem.mutate(
      {
        id: itemId,
        values: { work_date: newDate, display_order: newDisplayOrder },
      },
      {
        onSuccess: () => toast.success(`Moved to ${newDate}`),
      }
    );
  };

  const handleReorderDay = (date: string, orderedIds: string[]) => {
    reorderDay.mutate({ orderedIds });
  };

  const handlePrevWeek = () => setAnchorDate((d) => addDays(d, -7));
  const handleNextWeek = () => setAnchorDate((d) => addDays(d, 7));
  const handleToday = () => setAnchorDate(new Date());

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading upcoming work...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <WeekHeader
        anchorDate={anchorDate}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        needsEntryCount={needsEntryCount}
        onPrev={handlePrevWeek}
        onNext={handleNextWeek}
        onToday={handleToday}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsContent value="board" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">Scheduled</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Complete</span>
            </div>
            <CrewFilter crews={crews} selected={selectedCrews} onChange={setSelectedCrews} />
          </div>

          <div className="overflow-x-auto pb-2">
            <BoardView
              monday={monday}
              items={filteredBoardItems}
              canManage={canManage}
              onEdit={openEditDialog}
              onComplete={handleComplete}
              onAdd={openAddDialog}
              onMoveItem={handleMoveItem}
              onReorderDay={handleReorderDay}
            />
          </div>

          <Separator />

          <SiteNotes value={weekNote} canManage={canManage} onSave={(notes) => saveWeekNote.mutate(notes)} />

          <HorizonPanel
            items={filteredHorizonItems}
            canManage={canManage}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            onAdd={() => openAddDialog(null)}
          />
        </TabsContent>

        <TabsContent value="needs-entry">
          <NeedsEntryTab
            items={needsEntryItems}
            canManage={canManage}
            onMarkEntered={handleMarkEntered}
          />
        </TabsContent>
      </Tabs>

      <EditItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        initialDate={dialogInitialDate}
        phases={phases}
        crews={crews}
        onSave={handleSave}
        onDelete={canManage ? handleDelete : undefined}
      />
    </div>
  );
}

