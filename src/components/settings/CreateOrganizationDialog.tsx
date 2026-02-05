import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2 } from "lucide-react";

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { refetch } = useOrganization();
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setLoading(true);
    try {
      // Generate invite code
      const { data: generatedCode, error: codeError } = await supabase
        .rpc("generate_invite_code");

      if (codeError) {
        throw new Error(`Failed to generate invite code: ${codeError.message}`);
      }

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: companyName.trim(),
          invite_code: generatedCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }

      // Create membership as owner
      const { error: membershipError } = await supabase
        .from("organization_memberships")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner",
        });

      if (membershipError) {
        throw new Error(`Failed to create membership: ${membershipError.message}`);
      }

      // Seed default reference data
      const { error: seedError } = await supabase
        .rpc("seed_organization_defaults", { p_organization_id: org.id });

      if (seedError) {
        console.error("Failed to seed defaults:", seedError);
        // Don't throw - org was created successfully
      }

      toast({
        title: "Organization created!",
        description: `${companyName} has been created. Your invite code is: ${generatedCode}`,
      });

      await refetch();
      setCompanyName("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <DialogTitle>Create New Organization</DialogTitle>
          </div>
          <DialogDescription>
            Create a new organization and become its owner. You'll receive an invite code to share with team members.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-company-name">Company Name</Label>
            <Input
              id="create-company-name"
              type="text"
              placeholder="Enter company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !companyName.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Organization"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
