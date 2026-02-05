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
  const { toast } = useToast();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setLoading(true);
    try {
      // Find organization by invite code (case-insensitive)
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, invite_code")
        .ilike("invite_code", inviteCode.trim())
        .single();

      if (orgError || !org) {
        throw new Error("Invalid invite code. Please check and try again.");
      }

      // Check if already a member
      const alreadyMember = allOrganizations.some(
        (m) => m.organization_id === org.id
      );
      if (alreadyMember) {
        throw new Error("You are already a member of this organization.");
      }

      // Create membership as member
      const { error: membershipError } = await supabase
        .from("organization_memberships")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "member",
        });

      if (membershipError) throw membershipError;

      toast({
        title: "Joined organization!",
        description: `You are now a member of ${org.name}.`,
      });

      await refetch();
      setInviteCode("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to join organization",
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
