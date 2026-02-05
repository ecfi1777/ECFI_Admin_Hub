import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Trash2, Crown, User } from "lucide-react";
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
  const { organization, isOwner } = useOrganization();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch memberships
      const { data: memberships, error: membershipError } = await supabase
        .from("organization_memberships")
        .select("id, user_id, role, created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: true });

      if (membershipError) throw membershipError;
      if (!memberships?.length) return [];

      // Fetch profiles for all members
      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", userIds);

      if (profileError) throw profileError;

      // Combine data
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
      toast({
        title: "Member removed",
        description: "The team member has been removed from the organization.",
      });
      setMemberToRemove(null);
    },
    onError: (error) => {
      console.error("Failed to remove member:", error);
      toast({
        title: "Failed to remove member",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleRemove = (member: TeamMember) => {
    setMemberToRemove(member);
  };

  const confirmRemove = () => {
    if (memberToRemove) {
      removeMutation.mutate(memberToRemove.id);
    }
  };

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
    return (
      <p className="text-sm text-muted-foreground">No team members found.</p>
    );
  }

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
              {isOwner && <TableHead className="w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const isMemberOwner = member.role === "owner";

              return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.email || "—"}
                  </TableCell>
                  <TableCell>{member.display_name || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={isMemberOwner ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {isMemberOwner ? (
                        <Crown className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(member.created_at), "MMM d, yyyy")}
                  </TableCell>
                  {isOwner && (
                    <TableCell>
                      {!isMemberOwner && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(member)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
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
    </>
  );
}
