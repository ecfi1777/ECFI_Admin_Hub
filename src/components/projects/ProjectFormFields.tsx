import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface ProjectFormData {
  builderId: string;
  locationId: string;
  lotNumber: string;
  statusId: string;
  notes: string;
  fullAddress: string;
  county: string;
  permitNumber: string;
  authorizationNumbers: string;
  wallHeight: string;
  basementType: string;
  googleDriveUrl: string;
}

interface ProjectFormFieldsProps {
  formData: ProjectFormData;
  onChange: (field: keyof ProjectFormData, value: string) => void;
  builders: Builder[];
  locations: Location[];
  statuses: Status[];
}

const COUNTIES = ["A.A.", "P.G.", "Chas.", "Calvert", "Mo.Co.", "Howard", "St.Mary", "Other"];
const WALL_HEIGHTS = ["1'", "2'", "3'", "4'", "5'", "6'", "7'", "8'", "9'", "10'", "11'", "12'"];
const BASEMENT_TYPES = ["In Ground", "Walk Out"];

export function ProjectFormFields({
  formData,
  onChange,
  builders,
  locations,
  statuses,
}: ProjectFormFieldsProps) {
  const [showNewBuilder, setShowNewBuilder] = useState(false);
  const [showNewLocation, setShowNewLocation] = useState(false);
  const [newBuilderName, setNewBuilderName] = useState("");
  const [newBuilderCode, setNewBuilderCode] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createBuilderMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("builders")
        .insert({ name: newBuilderName, code: newBuilderCode || null })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["builders-active"] });
      onChange("builderId", data.id);
      setShowNewBuilder(false);
      setNewBuilderName("");
      setNewBuilderCode("");
      toast({ title: "Builder created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .insert({ name: newLocationName })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["locations-active"] });
      onChange("locationId", data.id);
      setShowNewLocation(false);
      setNewLocationName("");
      toast({ title: "Location created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Builder Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300">Builder</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewBuilder(!showNewBuilder)}
            className="text-amber-500 hover:text-amber-400 h-6 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
        </div>
        {showNewBuilder ? (
          <div className="space-y-2 p-3 bg-slate-900 rounded-md">
            <Input
              placeholder="Builder name"
              value={newBuilderName}
              onChange={(e) => setNewBuilderName(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Input
              placeholder="Code (optional)"
              value={newBuilderCode}
              onChange={(e) => setNewBuilderCode(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => createBuilderMutation.mutate()}
                disabled={!newBuilderName || createBuilderMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900"
              >
                {createBuilderMutation.isPending ? "Creating..." : "Add Builder"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowNewBuilder(false)}
                className="text-slate-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Select value={formData.builderId} onValueChange={(v) => onChange("builderId", v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Select builder" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {builders.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-white">
                  {b.code ? `${b.code} - ${b.name}` : b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Location Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-slate-300">Location</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewLocation(!showNewLocation)}
            className="text-amber-500 hover:text-amber-400 h-6 px-2"
          >
            <Plus className="w-3 h-3 mr-1" />
            New
          </Button>
        </div>
        {showNewLocation ? (
          <div className="space-y-2 p-3 bg-slate-900 rounded-md">
            <Input
              placeholder="Location name"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => createLocationMutation.mutate()}
                disabled={!newLocationName || createLocationMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900"
              >
                {createLocationMutation.isPending ? "Creating..." : "Add Location"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowNewLocation(false)}
                className="text-slate-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Select value={formData.locationId} onValueChange={(v) => onChange("locationId", v)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id} className="text-white">
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Lot Number */}
      <div className="space-y-2">
        <Label className="text-slate-300">Lot Number *</Label>
        <Input
          value={formData.lotNumber}
          onChange={(e) => onChange("lotNumber", e.target.value)}
          required
          placeholder="e.g., 12-18V"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {/* Full Address */}
      <div className="space-y-2">
        <Label className="text-slate-300">Full Address</Label>
        <Input
          value={formData.fullAddress}
          onChange={(e) => onChange("fullAddress", e.target.value)}
          placeholder="Enter full address"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {/* County */}
      <div className="space-y-2">
        <Label className="text-slate-300">County</Label>
        <Select value={formData.county} onValueChange={(v) => onChange("county", v)}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Select county" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            {COUNTIES.map((c) => (
              <SelectItem key={c} value={c} className="text-white">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Permit Number */}
      <div className="space-y-2">
        <Label className="text-slate-300">Permit Number</Label>
        <Input
          value={formData.permitNumber}
          onChange={(e) => onChange("permitNumber", e.target.value)}
          placeholder="Enter permit number"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {/* Authorization Numbers */}
      <div className="space-y-2">
        <Label className="text-slate-300">Authorization Numbers</Label>
        <Input
          value={formData.authorizationNumbers}
          onChange={(e) => onChange("authorizationNumbers", e.target.value)}
          placeholder="Enter authorization numbers"
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {/* Wall Height */}
      <div className="space-y-2">
        <Label className="text-slate-300">Wall Height</Label>
        <Select value={formData.wallHeight} onValueChange={(v) => onChange("wallHeight", v)}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Select wall height" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            {WALL_HEIGHTS.map((h) => (
              <SelectItem key={h} value={h} className="text-white">
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Basement Type */}
      <div className="space-y-2">
        <Label className="text-slate-300">Basement Type</Label>
        <Select value={formData.basementType} onValueChange={(v) => onChange("basementType", v)}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Select basement type" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            {BASEMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="text-white">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label className="text-slate-300">Status</Label>
        <Select value={formData.statusId} onValueChange={(v) => onChange("statusId", v)}>
          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600">
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-white">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Google Drive URL */}
      <div className="space-y-2">
        <Label className="text-slate-300">Google Drive Folder URL</Label>
        <Input
          value={formData.googleDriveUrl}
          onChange={(e) => onChange("googleDriveUrl", e.target.value)}
          placeholder="https://drive.google.com/..."
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-slate-300">Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Additional notes..."
          className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
        />
      </div>
    </div>
  );
}
