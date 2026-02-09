import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Plus } from "lucide-react";
import { ProjectFormFields } from "./ProjectFormFields";
import { useOrganization } from "@/hooks/useOrganization";

interface Builder {
  id: string;
  name: string;
  code: string | null;
}

interface Location {
  id: string;
  name: string;
}

interface Status {
  id: string;
  name: string;
}

interface AddProjectDialogProps {
  builders: Builder[];
  locations: Location[];
  statuses: Status[];
}

export function AddProjectDialog({ builders, locations, statuses }: AddProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Default status to the first status (Upcoming / display_order 1)
  const defaultStatusId = statuses.length > 0 ? statuses[0].id : "";
  const [formData, setFormData] = useState({
    builderId: "",
    locationId: "",
    lotNumber: "",
    statusId: defaultStatusId,
    notes: "",
    fullAddress: "",
    county: "",
    permitNumber: "",
    authorizationNumbers: "",
    wallHeight: "",
    basementType: "",
    googleDriveUrl: "",
  });

  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization found");
      const { error } = await supabase.from("projects").insert({
        organization_id: organizationId,
        builder_id: formData.builderId || null,
        location_id: formData.locationId || null,
        lot_number: formData.lotNumber,
        status_id: formData.statusId,
        notes: formData.notes || null,
        full_address: formData.fullAddress || null,
        county: formData.county || null,
        permit_number: formData.permitNumber || null,
        authorization_numbers: formData.authorizationNumbers || null,
        wall_height: formData.wallHeight || null,
        basement_type: formData.basementType || null,
        google_drive_url: formData.googleDriveUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
      setIsOpen(false);
      setFormData({
        builderId: "",
        locationId: "",
        lotNumber: "",
        statusId: defaultStatusId,
        notes: "",
        fullAddress: "",
        county: "",
        permitNumber: "",
        authorizationNumbers: "",
        wallHeight: "",
        basementType: "",
        googleDriveUrl: "",
      });
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-lg max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Project</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <ProjectFormFields
            formData={formData}
            onChange={handleChange}
            builders={builders}
            locations={locations}
            statuses={statuses}
          />
          <Button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900"
            disabled={!formData.lotNumber || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
