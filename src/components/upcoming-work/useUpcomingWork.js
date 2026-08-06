import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, startOfWeek } from "date-fns";
import { toast } from "sonner";
const ITEMS_QUERY_KEY = "upcoming-work-items";
const NOTES_QUERY_KEY = "upcoming-work-week-notes";
function toDateStr(date) {
    return format(date, "yyyy-MM-dd");
}
export function useWeekRange(anchorDate) {
    const monday = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const sunday = addDays(monday, 6);
    return { monday, sunday, mondayStr: toDateStr(monday), sundayStr: toDateStr(sunday) };
}
export function useUpcomingWork(anchorDate) {
    const { organizationId } = useOrganization();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { mondayStr, sundayStr } = useWeekRange(anchorDate);
    const baseKey = [ITEMS_QUERY_KEY, organizationId];
    const weekKey = [...baseKey, "week", mondayStr];
    const horizonKey = [...baseKey, "horizon", sundayStr];
    const needsEntryKey = [...baseKey, "needs-entry"];
    const noteKey = [NOTES_QUERY_KEY, organizationId, mondayStr];
    const itemsForWeek = useQuery({
        queryKey: weekKey,
        queryFn: async () => {
            if (!organizationId)
                return [];
            const { data, error } = await supabase
                .from("upcoming_work_items")
                .select(`
          id,
          organization_id,
          work_date,
          crew_id,
          phase_id,
          phase_custom,
          description,
          status,
          entered_in_main_schedule,
          display_order,
          created_at,
          updated_at,
          created_by,
          updated_by,
          crews ( id, name, color ),
          phases ( id, name )
        `)
                .eq("organization_id", organizationId)
                .gte("work_date", mondayStr)
                .lte("work_date", sundayStr)
                .order("display_order", { ascending: true })
                .order("created_at", { ascending: true });
            if (error)
                throw error;
            return (data || []);
        },
        enabled: !!organizationId,
    });
    const horizonItems = useQuery({
        queryKey: horizonKey,
        queryFn: async () => {
            if (!organizationId)
                return [];
            const { data, error } = await supabase
                .from("upcoming_work_items")
                .select(`
          id,
          organization_id,
          work_date,
          crew_id,
          phase_id,
          phase_custom,
          description,
          status,
          entered_in_main_schedule,
          display_order,
          created_at,
          updated_at,
          created_by,
          updated_by,
          crews ( id, name, color ),
          phases ( id, name )
        `)
                .eq("organization_id", organizationId)
                .or(`work_date.gt.${sundayStr},work_date.is.null`)
                .order("work_date", { ascending: true, nullsFirst: false })
                .order("display_order", { ascending: true })
                .order("created_at", { ascending: true });
            if (error)
                throw error;
            return (data || []);
        },
        enabled: !!organizationId,
    });
    const needsEntryCount = useQuery({
        queryKey: [...needsEntryKey, "count"],
        queryFn: async () => {
            if (!organizationId)
                return 0;
            const { count, error } = await supabase
                .from("upcoming_work_items")
                .select("id", { count: "exact", head: true })
                .eq("organization_id", organizationId)
                .eq("status", "complete")
                .eq("entered_in_main_schedule", false);
            if (error)
                throw error;
            return count || 0;
        },
        enabled: !!organizationId,
    });
    const needsEntryItems = useQuery({
        queryKey: [...needsEntryKey, "list"],
        queryFn: async () => {
            if (!organizationId)
                return [];
            const { data, error } = await supabase
                .from("upcoming_work_items")
                .select(`
          id,
          organization_id,
          work_date,
          crew_id,
          phase_id,
          phase_custom,
          description,
          status,
          entered_in_main_schedule,
          display_order,
          created_at,
          updated_at,
          created_by,
          updated_by,
          crews ( id, name, color ),
          phases ( id, name )
        `)
                .eq("organization_id", organizationId)
                .eq("status", "complete")
                .eq("entered_in_main_schedule", false)
                .order("work_date", { ascending: true })
                .order("display_order", { ascending: true });
            if (error)
                throw error;
            return (data || []);
        },
        enabled: !!organizationId,
    });
    const weekNote = useQuery({
        queryKey: noteKey,
        queryFn: async () => {
            if (!organizationId)
                return null;
            const { data, error } = await supabase
                .from("upcoming_work_week_notes")
                .select("id, organization_id, week_start_date, notes, created_at, updated_at")
                .eq("organization_id", organizationId)
                .eq("week_start_date", mondayStr)
                .maybeSingle();
            if (error)
                throw error;
            return data;
        },
        enabled: !!organizationId,
    });
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: baseKey });
        queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY, organizationId] });
    };
    const createItem = useMutation({
        mutationFn: async (values) => {
            if (!organizationId)
                throw new Error("No organization");
            const displayOrder = await nextDisplayOrder(organizationId, values.work_date);
            const { data, error } = await supabase
                .from("upcoming_work_items")
                .insert({
                organization_id: organizationId,
                ...values,
                display_order: displayOrder,
                created_by: user?.id || null,
                updated_by: user?.id || null,
            })
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAll();
        },
        onError: (err) => {
            toast.error(err.message || "Failed to save item");
        },
    });
    const updateItem = useMutation({
        mutationFn: async ({ id, values, }) => {
            if (!organizationId)
                throw new Error("No organization");
            const { data, error } = await supabase
                .from("upcoming_work_items")
                .update({
                ...values,
                updated_by: user?.id || null,
            })
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAll();
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update item");
        },
    });
    const deleteItem = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("upcoming_work_items").delete().eq("id", id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            invalidateAll();
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete item");
        },
    });
    const markComplete = useMutation({
        mutationFn: async (id) => {
            if (!organizationId)
                throw new Error("No organization");
            const { data, error } = await supabase
                .from("upcoming_work_items")
                .update({ status: "complete", updated_by: user?.id || null })
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAll();
        },
        onError: (err) => {
            toast.error(err.message || "Failed to mark complete");
        },
    });
    const markEnteredInMainSchedule = useMutation({
        mutationFn: async (id) => {
            if (!organizationId)
                throw new Error("No organization");
            const { data, error } = await supabase
                .from("upcoming_work_items")
                .update({ entered_in_main_schedule: true, updated_by: user?.id || null })
                .eq("id", id)
                .select()
                .single();
            if (error)
                throw error;
            return data;
        },
        onSuccess: () => {
            invalidateAll();
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update item");
        },
    });
    const saveWeekNote = useMutation({
        mutationFn: async (notes) => {
            if (!organizationId)
                throw new Error("No organization");
            const existing = weekNote.data;
            if (existing) {
                const { error } = await supabase
                    .from("upcoming_work_week_notes")
                    .update({ notes, updated_by: user?.id || null })
                    .eq("id", existing.id);
                if (error)
                    throw error;
            }
            else {
                const { error } = await supabase.from("upcoming_work_week_notes").insert({
                    organization_id: organizationId,
                    week_start_date: mondayStr,
                    notes,
                    created_by: user?.id || null,
                    updated_by: user?.id || null,
                });
                if (error)
                    throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: noteKey });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to save site notes");
        },
    });
    const reorderDay = useMutation({
        mutationFn: async ({ orderedIds }) => {
            if (!organizationId)
                throw new Error("No organization");
            await Promise.all(orderedIds.map((id, index) => supabase
                .from("upcoming_work_items")
                .update({ display_order: index + 1, updated_by: user?.id || null })
                .eq("id", id)
                .then(({ error }) => {
                if (error)
                    throw error;
            })));
        },
        onSuccess: () => {
            invalidateAll();
        },
        onError: (err) => {
            toast.error(err.message || "Failed to reorder items");
        },
    });
    return {
        itemsForWeek: itemsForWeek.data || [],
        horizonItems: horizonItems.data || [],
        needsEntryCount: needsEntryCount.data || 0,
        needsEntryItems: needsEntryItems.data || [],
        weekNote: weekNote.data?.notes || "",
        isLoading: itemsForWeek.isLoading ||
            horizonItems.isLoading ||
            needsEntryCount.isLoading ||
            needsEntryItems.isLoading ||
            weekNote.isLoading,
        createItem,
        updateItem,
        deleteItem,
        markComplete,
        markEnteredInMainSchedule,
        saveWeekNote,
        reorderDay,
    };
}
async function nextDisplayOrder(organizationId, workDate) {
    const { data, error } = await supabase
        .from("upcoming_work_items")
        .select("display_order")
        .eq("organization_id", organizationId)
        .eq("work_date", workDate)
        .order("display_order", { ascending: false })
        .limit(1)
        .single();
    if (error || !data)
        return 1;
    return (data.display_order || 0) + 1;
}
