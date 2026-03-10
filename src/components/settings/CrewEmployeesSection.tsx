import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Plus, Trash2, ChevronDown, ChevronRight, DollarSign } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useOrganization } from "@/hooks/useOrganization";

interface CrewEmployee {
  id: string;
  crew_id: string;
  name: string;
  hourly_rate: number | null;
  is_active: boolean;
  display_order: number;
  _isNew?: boolean;
}

interface CrewEmployeesSectionProps {
  crewId: string;
}

export function CrewEmployeesSection({ crewId }: CrewEmployeesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<CrewEmployee | null>(null);
  const [newRows, setNewRows] = useState<CrewEmployee[]>([]);
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const { data: employees = [] } = useQuery({
    queryKey: ["crew-employees", crewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crew_employees")
        .select("*")
        .eq("crew_id", crewId)
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data as CrewEmployee[];
    },
    enabled: isOpen,
  });

  const activeCount = employees.filter((e) => e.is_active).length + newRows.length;

  const upsertMutation = useMutation({
    mutationFn: async (employee: { id?: string; name: string; hourly_rate: number | null; crew_id: string }) => {
      if (!organizationId) throw new Error("No organization");
      if (!employee.name.trim()) return;

      if (employee.id) {
        const { error } = await supabase
          .from("crew_employees")
          .update({ name: employee.name, hourly_rate: employee.hourly_rate } as any)
          .eq("id", employee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("crew_employees")
          .insert({
            organization_id: organizationId,
            crew_id: employee.crew_id,
            name: employee.name,
            hourly_rate: employee.hourly_rate,
            is_active: true,
            display_order: employees.length + newRows.length,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-employees", crewId] });
      toast.success("Employee saved");
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crew_employees")
        .update({ is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-employees", crewId] });
      toast.success("Employee removed");
      setDeleteConfirmOpen(false);
      setEmployeeToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("crew_employees")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crew-employees", crewId] });
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleAddRow = () => {
    setNewRows((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        crew_id: crewId,
        name: "",
        hourly_rate: null,
        is_active: true,
        display_order: 0,
        _isNew: true,
      },
    ]);
  };

  const handleNewRowBlur = (row: CrewEmployee, field: "name" | "hourly_rate", value: string) => {
    const updated = { ...row };
    if (field === "name") updated.name = value;
    if (field === "hourly_rate") updated.hourly_rate = value ? parseFloat(value) : null;

    setNewRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));

    if (updated.name.trim()) {
      upsertMutation.mutate(
        { crew_id: crewId, name: updated.name, hourly_rate: updated.hourly_rate },
        {
          onSuccess: () => {
            setNewRows((prev) => prev.filter((r) => r.id !== row.id));
          },
        }
      );
    }
  };

  const handleExistingBlur = (employee: CrewEmployee, field: "name" | "hourly_rate", value: string) => {
    const newName = field === "name" ? value : employee.name;
    const newRate = field === "hourly_rate" ? (value ? parseFloat(value) : null) : employee.hourly_rate;

    if (newName === employee.name && newRate === employee.hourly_rate) return;
    if (!newName.trim()) return;

    upsertMutation.mutate({ id: employee.id, crew_id: crewId, name: newName, hourly_rate: newRate });
  };

  const handleDeleteClick = (employee: CrewEmployee) => {
    setEmployeeToDelete(employee);
    setDeleteConfirmOpen(true);
  };

  const allRows = [...employees, ...newRows];

  return (
    <>
      <div className="px-12 py-1 border-t border-border/30">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1"
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          <span className="font-medium">Employees ({activeCount})</span>
        </button>

        {isOpen && (
          <div className="mt-1 mb-2">
            {/* Header */}
            {allRows.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <span className="flex-1">Name</span>
                <span className="w-28">Hourly Rate</span>
                <span className="w-14 text-center">Active</span>
                <span className="w-8"></span>
              </div>
            )}

            {/* Existing employees */}
            {employees.map((emp) => (
              <EmployeeRow
                key={emp.id}
                employee={emp}
                onBlur={handleExistingBlur}
                onToggleActive={(id, checked) => toggleActiveMutation.mutate({ id, is_active: checked })}
                onDelete={handleDeleteClick}
              />
            ))}

            {/* New rows */}
            {newRows.map((row) => (
              <NewEmployeeRow key={row.id} row={row} onBlur={handleNewRowBlur} />
            ))}

            {/* Add button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddRow}
              className="text-muted-foreground hover:text-foreground mt-1"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Employee
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Remove Employee"
        description={`Remove ${employeeToDelete?.name} from this crew?`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (employeeToDelete) {
            deactivateMutation.mutate(employeeToDelete.id);
          }
        }}
        variant="destructive"
      />
    </>
  );
}

function EmployeeRow({
  employee,
  onBlur,
  onToggleActive,
  onDelete,
}: {
  employee: CrewEmployee;
  onBlur: (emp: CrewEmployee, field: "name" | "hourly_rate", value: string) => void;
  onToggleActive: (id: string, checked: boolean) => void;
  onDelete: (emp: CrewEmployee) => void;
}) {
  const [name, setName] = useState(employee.name);
  const [rate, setRate] = useState(employee.hourly_rate?.toString() ?? "");

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${!employee.is_active ? "opacity-50" : ""}`}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onBlur(employee, "name", name)}
        className="flex-1 h-7 text-sm"
        placeholder="Employee name"
      />
      <div className="relative w-28">
        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          type="number"
          step="0.01"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={() => onBlur(employee, "hourly_rate", rate)}
          className="h-7 text-sm pl-6"
          placeholder="0.00"
        />
      </div>
      <div className="w-14 flex justify-center">
        <Checkbox
          checked={employee.is_active}
          onCheckedChange={(checked) => onToggleActive(employee.id, !!checked)}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(employee)}
        className="text-muted-foreground hover:text-destructive h-7 w-8"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

function NewEmployeeRow({
  row,
  onBlur,
}: {
  row: CrewEmployee;
  onBlur: (row: CrewEmployee, field: "name" | "hourly_rate", value: string) => void;
}) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // Auto-focus name field
  useState(() => {
    setTimeout(() => nameRef.current?.focus(), 50);
  });

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded">
      <Input
        ref={nameRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onBlur(row, "name", name)}
        className="flex-1 h-7 text-sm"
        placeholder="Employee name"
      />
      <div className="relative w-28">
        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          type="number"
          step="0.01"
          min="0"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          onBlur={() => {
            setRate(rate);
            onBlur(row, "hourly_rate", rate);
          }}
          className="h-7 text-sm pl-6"
          placeholder="0.00"
        />
      </div>
      <div className="w-14" />
      <div className="w-8" />
    </div>
  );
}
