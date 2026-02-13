import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getUserFriendlyError } from "@/lib/errorHandler";
import { Building2, Copy, Check, Users, RefreshCw, Pencil, X, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TeamMembersTable } from "./TeamMembersTable";
import { StorageUsageCard } from "./StorageUsageCard";
import { MyOrganizations } from "./MyOrganizations";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";

export function OrganizationSettings() {
  const { organization, allOrganizations, switchOrganization, isOwner, isLoading } = useOrganization();
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Fetch invite code via secure RPC — only for owners
  const { data: inviteCode } = useQuery({
    queryKey: ["invite-code", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const { data, error } = await supabase.rpc("get_invite_code" as any, {
        p_organization_id: organization.id,
      });
      if (error) throw error;
      return data as string | null;
    },
    enabled: isOwner && !!organization?.id,
    staleTime: 5 * 60 * 1000,
  });

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");
      const { data: newCode, error: codeError } = await supabase.rpc("generate_invite_code");
      if (codeError) throw codeError;
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ invite_code: newCode })
        .eq("id", organization.id);
      if (updateError) throw updateError;
      return newCode;
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["invite-code", organization?.id] });
      await queryClient.resetQueries({ queryKey: ["organizations"] });
      toast.success("The old invite code is no longer valid. Share the new code with team members.");
    },
    onError: (error: any) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!organization?.id) throw new Error("No organization");
      const { error } = await supabase
        .from("organizations")
        .update({ name: newName.trim() })
        .eq("id", organization.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ["organizations"] });
      setIsEditingName(false);
      toast.success("Your organization name has been changed successfully.");
    },
    onError: (error: any) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !user?.id) throw new Error("No organization or user");
      const { error: membershipsError } = await supabase
        .from("organization_memberships")
        .delete()
        .eq("organization_id", organization.id);
      if (membershipsError) throw membershipsError;
      const { error: orgError } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organization.id);
      if (orgError) throw orgError;
      const remainingOrgs = allOrganizations.filter(
        o => o.organization_id !== organization.id
      );
      return { remainingOrgs };
    },
    onSuccess: async ({ remainingOrgs }) => {
      await queryClient.resetQueries({ queryKey: ["organizations"] });
      await queryClient.resetQueries({ queryKey: ["organization-memberships"] });
      toast.success("Your organization has been permanently deleted.");
      if (remainingOrgs.length > 0) {
        switchOrganization(remainingOrgs[0].organization_id);
        window.location.href = "/settings";
      } else {
        navigate("/onboarding");
      }
    },
    onError: (error: any) => {
      toast.error(getUserFriendlyError(error));
    },
  });

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invite code copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Please copy the code manually.");
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
      <MyOrganizations />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>Organization Details</CardTitle>
          </div>
          <CardDescription>
            {isOwner ? "Manage your organization information" : "View your organization information"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  id="org-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Enter organization name"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (editedName.trim()) {
                      updateNameMutation.mutate(editedName);
                    }
                  }}
                  disabled={!editedName.trim() || updateNameMutation.isPending}
                  size="sm"
                >
                  {updateNameMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setIsEditingName(false);
                    setEditedName(organization.name);
                  }}
                  disabled={updateNameMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  id="org-name"
                  value={organization.name}
                  disabled
                  className="bg-muted"
                />
                {isOwner && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditedName(organization.name);
                      setIsEditingName(true);
                    }}
                    title="Edit organization name"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite Code — owner only */}
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
                  value={inviteCode || ""}
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

      {/* Team Members — owner only */}
      {isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Team Members</CardTitle>
            </div>
            <CardDescription>
              {isOwner
                ? "Manage users who have access to your organization"
                : "View users who have access to your organization"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMembersTable />
          </CardContent>
        </Card>
      )}

      {/* Storage Usage — owner only */}
      {isOwner && <StorageUsageCard />}

      {/* Danger Zone — owner only */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Permanently delete this organization and all its data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">This action cannot be undone</p>
                  <p className="text-sm text-muted-foreground">
                    Deleting this organization will permanently remove:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>All projects and schedule entries</li>
                    <li>All team members' access</li>
                    <li>All reference data (crews, phases, suppliers, etc.)</li>
                    <li>All uploaded documents</li>
                  </ul>
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Organization
            </Button>

            <ConfirmDialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) setDeleteConfirmation("");
              }}
              title="Delete Organization Permanently?"
              description={
                <div className="space-y-4">
                  <p>
                    Are you sure you want to delete <strong>"{organization.name}"</strong>? 
                    This will permanently delete all projects, schedules, and data. 
                    All team members will lose access. This cannot be undone.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="delete-confirm">
                      Type <span className="font-mono font-bold">{organization.name}</span> to confirm:
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder={organization.name}
                    />
                  </div>
                </div>
              }
              confirmLabel="Delete Organization"
              onConfirm={() => deleteOrgMutation.mutate()}
              variant="destructive"
              isLoading={deleteOrgMutation.isPending}
              confirmDisabled={deleteConfirmation !== organization.name}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
