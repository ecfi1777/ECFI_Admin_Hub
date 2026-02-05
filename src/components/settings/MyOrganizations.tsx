import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Users, Check, LogOut } from "lucide-react";
import { JoinOrganizationDialog } from "./JoinOrganizationDialog";
import { CreateOrganizationDialog } from "./CreateOrganizationDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function MyOrganizations() {
  const { allOrganizations, organizationId, switchOrganization, isLoading } = useOrganization();
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [leaveOrgId, setLeaveOrgId] = useState<string | null>(null);
  const [leaveOrgName, setLeaveOrgName] = useState<string>("");
  const [isLeaving, setIsLeaving] = useState(false);
  const queryClient = useQueryClient();

  const handleLeaveOrganization = async () => {
    if (!leaveOrgId) return;

    setIsLeaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("organization_memberships")
        .delete()
        .eq("organization_id", leaveOrgId)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(`You have left "${leaveOrgName}".`);

      // If leaving the active org, switch to another one
      if (leaveOrgId === organizationId) {
        const remaining = allOrganizations.filter(o => o.organization_id !== leaveOrgId);
        if (remaining.length > 0) {
          switchOrganization(remaining[0].organization_id);
        } else {
          // No orgs left - redirect to onboarding
          window.location.href = "/onboarding";
        }
      }

      // Refresh memberships
      queryClient.invalidateQueries({ queryKey: ["organization-memberships"] });
    } catch (error: any) {
      console.error("Leave org error:", error);
      toast.error(error.message || "Failed to leave organization.");
    } finally {
      setIsLeaving(false);
      setLeaveOrgId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-16 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <CardTitle>My Organizations</CardTitle>
          </div>
          <CardDescription>
            Organizations you belong to. Click to switch between them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {allOrganizations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You don't belong to any organizations yet.
            </p>
          ) : (
            <div className="space-y-2">
              {allOrganizations.map((membership) => {
                const isActive = membership.organization_id === organizationId;
                const isOwner = membership.role === "owner";
                return (
                  <div
                    key={membership.organization_id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border transition-colors
                      ${isActive 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                      }
                    `}
                  >
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => !isActive && switchOrganization(membership.organization_id)}
                    >
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        ${isActive ? "bg-primary text-primary-foreground" : "bg-muted"}
                      `}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {membership.organizations.name}
                          </span>
                          {isActive && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs capitalize">
                            {membership.role}
                          </Badge>
                          <span>·</span>
                          <span>
                            Joined {format(new Date(membership.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                      {!isOwner && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLeaveOrgId(membership.organization_id);
                            setLeaveOrgName(membership.organizations.name);
                          }}
                        >
                          <LogOut className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setJoinOpen(true)}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              Join Organization
            </Button>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(true)}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </div>
        </CardContent>
      </Card>

      <JoinOrganizationDialog open={joinOpen} onOpenChange={setJoinOpen} />
      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
      
      <ConfirmDialog
        open={!!leaveOrgId}
        onOpenChange={(open) => !open && setLeaveOrgId(null)}
        title="Leave Organization?"
        description={`Are you sure you want to leave "${leaveOrgName}"? You will lose access to all data in this organization. You can rejoin later with an invite code.`}
        confirmLabel="Leave Organization"
        onConfirm={handleLeaveOrganization}
        variant="destructive"
        isLoading={isLeaving}
      />
    </>
  );
}
