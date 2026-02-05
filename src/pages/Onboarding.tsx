import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { HardHat, Building2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Onboarding() {
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Generate invite code
      const { data: generatedCode, error: codeError } = await supabase
        .rpc("generate_invite_code");

      if (codeError) throw codeError;

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: companyName,
          invite_code: generatedCode,
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Create membership as owner
      const { error: membershipError } = await supabase
        .from("organization_memberships")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner",
        });

      if (membershipError) throw membershipError;

      // Seed default reference data
      const { error: seedError } = await supabase
        .rpc("seed_organization_defaults", { p_organization_id: org.id });

      if (seedError) throw seedError;

      // Invalidate organization query
      await queryClient.invalidateQueries({ queryKey: ["organization"] });

      toast({
        title: "Organization created!",
        description: `Welcome to ${companyName}. Your invite code is: ${generatedCode}`,
      });

      navigate("/");
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

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Find organization by invite code
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .single();

      if (orgError || !org) {
        throw new Error("Invalid invite code. Please check and try again.");
      }

      // Check if already a member
      const { data: existingMembership } = await supabase
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", org.id)
        .eq("user_id", user.id)
        .single();

      if (existingMembership) {
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

      // Invalidate organization query
      await queryClient.invalidateQueries({ queryKey: ["organization"] });

      toast({
        title: "Joined organization!",
        description: `Welcome to ${org.name}.`,
      });

      navigate("/");
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center">
            <HardHat className="w-10 h-10 text-slate-900" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">Welcome to ECFI Hub</CardTitle>
            <CardDescription className="text-slate-400">
              Set up your organization to get started
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger 
                value="create" 
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Create
              </TabsTrigger>
              <TabsTrigger 
                value="join" 
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900"
              >
                <Users className="w-4 h-4 mr-2" />
                Join
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreateOrganization} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-slate-300">Company Name</Label>
                  <Input
                    id="company-name"
                    type="text"
                    placeholder="Your Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <p className="text-sm text-slate-400">
                  This will create a new organization with you as the owner. 
                  You'll receive an invite code to share with your team members.
                </p>
                <Button 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Organization"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoinOrganization} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code" className="text-slate-300">Invite Code</Label>
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder="Enter invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    required
                    maxLength={8}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 uppercase"
                  />
                </div>
                <p className="text-sm text-slate-400">
                  Enter the invite code you received from your organization admin.
                </p>
                <Button 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                  disabled={loading}
                >
                  {loading ? "Joining..." : "Join Organization"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
