import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GripVertical, Save } from "lucide-react";
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

export function CrewOrderTable() {
  const [orderValues, setOrderValues] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: crews = [], isLoading } = useQuery({
    queryKey: ["crews-all-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews")
        .select("id, name, display_order, is_active")
        .eq("is_active", true)
        .order("display_order")
        .order("name");
      if (error) throw error;
      
      // Initialize order values
      const initialValues: Record<string, number> = {};
      data.forEach((crew: Crew) => {
        initialValues[crew.id] = crew.display_order;
      });
      setOrderValues(initialValues);
      
      return data as Crew[];
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
      toast({ title: "Crew order saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOrderChange = (crewId: string, value: string) => {
    setOrderValues((prev) => ({
      ...prev,
      [crewId]: parseInt(value) || 0,
    }));
  };

  const handleSave = () => {
    const updates = Object.entries(orderValues).map(([id, display_order]) => ({
      id,
      display_order,
    }));
    updateMutation.mutate(updates);
  };

  // Sort crews for display (numbers first, then alphabetical)
  const sortedCrews = [...crews].sort((a, b) => {
    const aOrder = orderValues[a.id] ?? a.display_order;
    const bOrder = orderValues[b.id] ?? b.display_order;
    
    // First sort by display_order if set (non-zero)
    if (aOrder !== 0 || bOrder !== 0) {
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
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

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Crew Display Order</h3>
          <p className="text-sm text-muted-foreground">
            Set the display order for crews on the schedule. Lower numbers appear first. Use 0 for default sorting (numbers first, then alphabetical).
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
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
              <TableHead className="text-muted-foreground w-32">Display Order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCrews.map((crew) => (
              <TableRow key={crew.id} className="border-border">
                <TableCell className="py-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </TableCell>
                <TableCell className="text-foreground font-medium py-2">
                  {crew.name}
                </TableCell>
                <TableCell className="py-2">
                  <Input
                    type="number"
                    value={orderValues[crew.id] ?? crew.display_order}
                    onChange={(e) => handleOrderChange(crew.id, e.target.value)}
                    className="h-8 w-20 bg-muted border-border text-foreground"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
