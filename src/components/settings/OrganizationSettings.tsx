import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Copy, Check, Users, RefreshCw } from "lucide-react";
import { TeamMembersTable } from "./TeamMembersTable";
import { MyOrganizations } from "./MyOrganizations";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function OrganizationSettings() {
  const { organization, isOwner, isLoading } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");
      
      // Call database function to generate new invite code
      const { data: newCode, error: codeError } = await supabase.rpc("generate_invite_code");
      if (codeError) throw codeError;
      
      // Update organization with new code
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ invite_code: newCode })
        .eq("id", organization.id);
      
      if (updateError) throw updateError;
      return newCode;
    },
    onSuccess: async () => {
      // Remove cached data and force immediate refetch
      await queryClient.resetQueries({ queryKey: ["organizations"] });
      toast({
        title: "Invite code regenerated",
        description: "The old invite code is no longer valid. Share the new code with team members.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to regenerate invite code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyInviteCode = async () => {
    if (!organization?.invite_code) return;
    
    try {
      await navigator.clipboard.writeText(organization.invite_code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Organization information not available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Organizations Section */}
      <MyOrganizations />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>Organization Details</CardTitle>
          </div>
          <CardDescription>
            View your organization information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={organization.name}
              disabled
              className="bg-muted"
            />
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Team Invite Code</CardTitle>
            </div>
            <CardDescription>
              Share this code with team members so they can join your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-code"
                  value={organization.invite_code}
                  readOnly
                  className="font-mono text-lg tracking-widest bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyInviteCode}
                  className="shrink-0"
                  title="Copy invite code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setRegenerateDialogOpen(true)}
                  className="shrink-0"
                  title="Regenerate invite code"
                  disabled={regenerateMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                New team members can use this code when signing up to automatically join your organization.
              </p>

              <ConfirmDialog
                open={regenerateDialogOpen}
                onOpenChange={setRegenerateDialogOpen}
                title="Regenerate Invite Code?"
                description={`This will invalidate the current invite code for "${organization.name}". Anyone with the old code will no longer be able to join. This action cannot be undone.`}
                confirmLabel="Regenerate"
                onConfirm={() => regenerateMutation.mutate()}
                variant="destructive"
                isLoading={regenerateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Team Members</CardTitle>
            </div>
            <CardDescription>
              Manage users who have access to your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembersTable />
          </CardContent>
        </Card>
      )}
    </div>
  );
}