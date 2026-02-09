import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

type TableName = "crews" | "builders" | "locations" | "phases" | "project_statuses" | "suppliers" | "pump_vendors" | "inspection_types" | "inspectors" | "concrete_mixes";

interface ReferenceDataTableProps {
  tableName: TableName;
  displayName: string;
  hasCode?: boolean;
  hasOrder?: boolean;
}

interface ReferenceItem {
  id: string;
  name: string;
  code?: string;
  display_order?: number;
  is_active: boolean;
}

export function ReferenceDataTable({ tableName, displayName, hasCode, hasOrder }: ReferenceDataTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReferenceItem | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: items = [], isLoading } = useQuery({
    queryKey: [tableName, organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const query = supabase.from(tableName).select("*").eq("organization_id", organizationId);
      
      if (hasOrder) {
        query.order("display_order", { ascending: true });
      } else {
        query.order("name", { ascending: true });
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ReferenceItem[];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: Partial<ReferenceItem>) => {
      if (!organizationId) throw new Error("No organization found");
      const { error } = await supabase.from(tableName).insert([{ ...newItem, organization_id: organizationId }] as any);
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

  const openDialog = (item?: ReferenceItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setCode(item.code || "");
      setDisplayOrder(item.display_order || 0);
    } else {
      setEditingItem(null);
      setName("");
      setCode("");
      setDisplayOrder(items.length + 1);
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setName("");
    setCode("");
    setDisplayOrder(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData: Partial<ReferenceItem> = { name };
    if (hasCode) itemData.code = code;
    if (hasOrder) itemData.display_order = displayOrder;

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...itemData });
    } else {
      createMutation.mutate(itemData);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">{displayName}</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => openDialog()} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {displayName.slice(0, -1)}
            </Button>
          </DialogTrigger>
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
              {hasOrder && (
                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-center py-8">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground text-center py-8">No items yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-muted-foreground">Name</TableHead>
                {hasCode && <TableHead className="text-muted-foreground">Code</TableHead>}
                {hasOrder && <TableHead className="text-muted-foreground">Order</TableHead>}
                <TableHead className="text-muted-foreground">Active</TableHead>
                <TableHead className="text-muted-foreground w-20">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-foreground font-medium">{item.name}</TableCell>
                  {hasCode && (
                    <TableCell className="text-muted-foreground">{item.code || "-"}</TableCell>
                  )}
                  {hasOrder && (
                    <TableCell className="text-muted-foreground">{item.display_order}</TableCell>
                  )}
                  <TableCell>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: item.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(item)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}