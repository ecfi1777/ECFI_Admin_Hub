import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
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
import { Loader2, Users } from "lucide-react";

interface JoinOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinOrganizationDialog({ open, onOpenChange }: JoinOrganizationDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { refetch, allOrganizations } = useOrganization();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_organization_by_invite_code" as any, {
        p_invite_code: inviteCode.trim(),
      });

      if (error) {
        if (error.message?.includes("Invalid invite code")) {
          throw new Error("Invalid invite code. Please check and try again.");
        }
        if (error.message?.includes("already")) {
          throw new Error("You are already a member of this organization.");
        }
        throw error;
      }

      const org = Array.isArray(data) ? data[0] : data;
      if (!org) {
        throw new Error("Invalid invite code. Please check and try again.");
      }

      toast.success(`You are now a member of ${org.name}.`);
      await refetch();
      setInviteCode("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, "Join organization"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <DialogTitle>Join Organization</DialogTitle>
          </div>
          <DialogDescription>
            Enter the invite code you received from an organization admin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="join-invite-code">Invite Code</Label>
            <Input
              id="join-invite-code"
              type="text"
              placeholder="Enter 8-character code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              disabled={loading}
              maxLength={8}
              className="uppercase font-mono tracking-widest"
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
            <Button type="submit" disabled={loading || !inviteCode.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Organization"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
