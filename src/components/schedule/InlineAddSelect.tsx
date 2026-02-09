import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUserFriendlyError } from "@/lib/errorHandler";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

interface Option {
  id: string;
  name: string;
  code?: string | null;
}

interface InlineAddSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  tableName: "suppliers" | "pump_vendors" | "inspection_types" | "inspectors";
  queryKey: string;
  hasCode?: boolean;
  showCode?: boolean;
}

export function InlineAddSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  tableName,
  queryKey,
  hasCode = false,
  showCode = false,
}: InlineAddSelectProps) {
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization found");
      const insertData = hasCode 
        ? { name: newName, code: newCode || null, organization_id: organizationId }
        : { name: newName, organization_id: organizationId };
      const { data, error } = await supabase
        .from(tableName)
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      onChange(data.id);
      setShowNew(false);
      setNewName("");
      setNewCode("");
      toast.success(`${label} created`);
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowNew(!showNew)}
          className="text-primary hover:text-primary/80 h-6 px-2"
        >
          <Plus className="w-3 h-3 mr-1" />
          New
        </Button>
      </div>
      {showNew ? (
        <div className="space-y-2 p-3 bg-muted rounded-md">
          <Input
            placeholder={`${label} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          {hasCode && (
            <Input
              placeholder="Code (optional)"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!newName || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : `Add ${label}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNew(false);
                setNewName("");
                setNewCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {showCode && opt.code ? `${opt.code} - ${opt.name}` : opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
