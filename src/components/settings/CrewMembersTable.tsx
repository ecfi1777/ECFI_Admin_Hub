import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";

interface CrewMember {
  id: string;
  name: string;
  crew_id: string | null;
  is_active: boolean;
  crews?: { name: string } | null;
}

interface Crew {
  id: string;
  name: string;
}

export function CrewMembersTable() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CrewMember | null>(null);
  const [name, setName] = useState("");
  const [crewId, setCrewId] = useState<string>("");
  
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: crewMembers = [], isLoading } = useQuery({
    queryKey: ["crew_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_members")
        .select("*, crews(name)")
        .order("name");
      if (error) throw error;
      return data as CrewMember[];
    },
  });

  const { data: crews = [] } = useQuery({
    queryKey: ["crews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crews")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Crew[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newItem: { name: string; crew_id: string | null }) => {
      if (!organizationId) throw new Error("No organization found");
      const { error } = await supabase.from("crew_members").insert({ ...newItem, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew_members"] });
      toast.success("Created successfully");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, crew_id }: { id: string; name: string; crew_id: string | null }) => {
      const { error } = await supabase.from("crew_members").update({ name, crew_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew_members"] });
      toast.success("Updated successfully");
      closeDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("crew_members").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew_members"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const openDialog = (item?: CrewMember) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setCrewId(item.crew_id || "");
    } else {
      setEditingItem(null);
      setName("");
      setCrewId("");
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setName("");
    setCrewId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData = { 
      name, 
      crew_id: crewId || null 
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...itemData });
    } else {
      createMutation.mutate(itemData);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Crew Members</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => openDialog()} 
              className="bg-amber-500 hover:bg-amber-600 text-slate-900"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Crew Member
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingItem ? "Edit" : "Add"} Crew Member
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Crew</Label>
                <Select value={crewId} onValueChange={setCrewId}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select a crew" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {crews.map((crew) => (
                      <SelectItem key={crew.id} value={crew.id} className="text-white">
                        {crew.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900"
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
          <div className="text-slate-400 text-center py-8">Loading...</div>
        ) : crewMembers.length === 0 ? (
          <div className="text-slate-400 text-center py-8">No crew members yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Crew</TableHead>
                <TableHead className="text-slate-400">Active</TableHead>
                <TableHead className="text-slate-400 w-20">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crewMembers.map((member) => (
                <TableRow key={member.id} className="border-slate-700">
                  <TableCell className="text-white font-medium">{member.name}</TableCell>
                  <TableCell className="text-slate-400">
                    {member.crews?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={member.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: member.id, is_active: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(member)}
                      className="text-slate-400 hover:text-white"
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
