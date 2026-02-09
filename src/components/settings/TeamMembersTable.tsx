import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Crown, User, ArrowRightLeft, Shield } from "lucide-react";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  display_name: string | null;
}

export function TeamMembersTable() {
  const { organization, isOwner, refetch: refetchOrg } = useOrganization();
  const { isOwner: isRoleOwner } = useUserRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [memberToTransfer, setMemberToTransfer] = useState<TeamMember | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data: memberships, error: membershipError } = await supabase
        .from("organization_memberships")
        .select("id, user_id, role, created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: true });
      if (membershipError) throw membershipError;
      if (!memberships?.length) return [];
      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);
      if (profileError) throw profileError;
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      return memberships.map((m) => ({
        ...m,
        email: profileMap.get(m.user_id)?.email || null,
        display_name: profileMap.get(m.user_id)?.display_name || null,
      })) as TeamMember[];
    },
    enabled: !!organization?.id,
    staleTime: 60 * 1000,
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("organization_memberships")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      toast.success("The team member has been removed from the organization.");
      setMemberToRemove(null);
    },
    onError: (error) => {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member. Please try again later.");
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (newOwnerId: string) => {
      if (!organization?.id || !user?.id) throw new Error("Missing organization or user");
      const currentOwnerMembership = members?.find(
        (m) => m.user_id === user.id && m.role === "owner"
      );
      const newOwnerMembership = members?.find((m) => m.user_id === newOwnerId);
      if (!currentOwnerMembership || !newOwnerMembership) throw new Error("Could not find membership records");

      const { error: newOwnerError } = await supabase
        .from("organization_memberships")
        .update({ role: "owner" })
        .eq("id", newOwnerMembership.id);
      if (newOwnerError) throw newOwnerError;

      const { error: currentOwnerError } = await supabase
        .from("organization_memberships")
        .update({ role: "manager" })
        .eq("id", currentOwnerMembership.id);
      if (currentOwnerError) throw currentOwnerError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      refetchOrg();
      toast.success(`${memberToTransfer?.email || "The member"} is now the owner of this organization.`);
      setMemberToTransfer(null);
    },
    onError: (error) => {
      console.error("Failed to transfer ownership:", error);
      toast.error("Failed to transfer ownership. Please try again later.");
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase
        .from("organization_memberships")
        .update({ role: newRole })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
      queryClient.invalidateQueries({ queryKey: ["user-role"] });
      toast.success("Role updated successfully.");
    },
    onError: (error) => {
      console.error("Failed to change role:", error);
      toast.error("Failed to update role.");
    },
  });

  const handleRemove = (member: TeamMember) => setMemberToRemove(member);
  const handleTransfer = (member: TeamMember) => setMemberToTransfer(member);
  const confirmRemove = () => { if (memberToRemove) removeMutation.mutate(memberToRemove.id); };
  const confirmTransfer = () => { if (memberToTransfer) transferMutation.mutate(memberToTransfer.user_id); };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!members?.length) {
    return <p className="text-sm text-muted-foreground">No team members found.</p>;
  }

  const getRoleBadge = (role: string) => {
    if (role === "owner") return { variant: "default" as const, icon: Crown, label: "Owner" };
    if (role === "manager") return { variant: "secondary" as const, icon: Shield, label: "Manager" };
    return { variant: "outline" as const, icon: User, label: "Viewer" };
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Date Joined</TableHead>
              {isOwner && <TableHead className="w-[120px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const isMemberOwner = member.role === "owner";
              const badge = getRoleBadge(member.role);
              const BadgeIcon = badge.icon;

              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email || "—"}</TableCell>
                  <TableCell>{member.display_name || "—"}</TableCell>
                  <TableCell>
                    {/* Owner can change roles of non-owners */}
                    {isRoleOwner && !isMemberOwner && !isCurrentUser ? (
                      <Select
                        value={member.role}
                        onValueChange={(newRole) =>
                          changeRoleMutation.mutate({ memberId: member.id, newRole })
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={badge.variant} className="gap-1">
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(member.created_at), "MMM d, yyyy")}
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      <div className="flex gap-1">
                        {!isMemberOwner && !isCurrentUser && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTransfer(member)}
                              title="Transfer ownership"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(member)}
                              title="Remove member"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${memberToRemove?.email || "this member"} from ${organization?.name}? They will lose access to all organization data.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemove}
        isLoading={removeMutation.isPending}
      />

      <ConfirmDialog
        open={!!memberToTransfer}
        onOpenChange={(open) => !open && setMemberToTransfer(null)}
        title="Transfer Ownership"
        description={`Are you sure you want to transfer ownership of "${organization?.name}" to ${memberToTransfer?.email || "this member"}? You will become a manager and they will become the owner.`}
        confirmLabel="Transfer Ownership"
        variant="default"
        onConfirm={confirmTransfer}
        isLoading={transferMutation.isPending}
      />
    </>
  );
}
