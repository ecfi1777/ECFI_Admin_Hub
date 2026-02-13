import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { ProjectFormFields } from "./ProjectFormFields";
import { invalidateProjectQueries } from "@/lib/queryHelpers";

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

interface Project {
  id: string;
  lot_number: string;
  notes: string | null;
  builder_id: string | null;
  location_id: string | null;
  status_id: string | null;
  full_address: string | null;
  county: string | null;
  permit_number: string | null;
  authorization_numbers: string | null;
  wall_height: string | null;
  basement_type: string | null;
  google_drive_url: string | null;
}

interface EditProjectDialogProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  builders: Builder[];
  locations: Location[];
  statuses: Status[];
}

export function EditProjectDialog({
  project,
  isOpen,
  onClose,
  builders,
  locations,
  statuses,
}: EditProjectDialogProps) {
  const [formData, setFormData] = useState({
    builderId: "",
    locationId: "",
    lotNumber: "",
    statusId: "",
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

  useEffect(() => {
    if (project) {
      setFormData({
        builderId: project.builder_id || "",
        locationId: project.location_id || "",
        lotNumber: project.lot_number || "",
        statusId: project.status_id || "",
        notes: project.notes || "",
        fullAddress: project.full_address || "",
        county: project.county || "",
        permitNumber: project.permit_number || "",
        authorizationNumbers: project.authorization_numbers || "",
        wallHeight: project.wall_height || "",
        basementType: project.basement_type || "",
        googleDriveUrl: project.google_drive_url || "",
      });
    }
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!project) return;
      const { error } = await supabase
        .from("projects")
        .update({
          builder_id: formData.builderId || null,
          location_id: formData.locationId || null,
          lot_number: formData.lotNumber,
          status_id: formData.statusId || null,
          notes: formData.notes || null,
          full_address: formData.fullAddress || null,
          county: formData.county || null,
          permit_number: formData.permitNumber || null,
          authorization_numbers: formData.authorizationNumbers || null,
          wall_height: formData.wallHeight || null,
          basement_type: formData.basementType || null,
          google_drive_url: formData.googleDriveUrl || null,
        })
        .eq("id", project.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateProjectQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["project", project?.id] });
      toast.success("Project updated");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-800 border-slate-700 w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] md:max-w-lg max-h-[100dvh] md:max-h-[90dvh] overflow-y-auto rounded-none md:rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Project</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
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
            disabled={!formData.lotNumber || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
