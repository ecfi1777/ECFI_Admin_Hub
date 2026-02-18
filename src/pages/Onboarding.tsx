import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { HardHat, Building2, Users, Loader2, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getUserFriendlyError } from "@/lib/errorHandler";

export default function Onboarding() {
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const navigate = useNavigate();
  const { user, initialized: authInitialized } = useAuth();
  const queryClient = useQueryClient();

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double-submission with ref (survives re-renders)
    if (isSubmittingRef.current) {
      console.log("Already submitting, ignoring duplicate click");
      return;
    }
    
    if (!user) {
      toast.error("Please sign in to create an organization.");
      return;
    }

    if (!companyName.trim()) {
      toast.error("Please enter a company name.");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    console.log("Starting organization creation for user:", user.id);
    
    try {
      // Step 1: Generate invite code
      console.log("Step 1: Generating invite code...");
      const { data: generatedCode, error: codeError } = await supabase
        .rpc("generate_invite_code");

      if (codeError) {
        if (import.meta.env.DEV) console.error("Failed to generate invite code:", codeError);
        throw new Error("Failed to generate invite code.");
      }
      console.log("Invite code generated:", generatedCode);

      // Step 2: Create organization (generate ID client-side to avoid SELECT policy issue)
      console.log("Step 2: Creating organization...");
      const orgId = crypto.randomUUID();
      const { error: orgError } = await supabase
        .from("organizations")
        .insert({
          id: orgId,
          name: companyName.trim(),
          invite_code: generatedCode,
          created_by: user.id,
        });

      if (orgError) {
        if (import.meta.env.DEV) console.error("Failed to create organization:", orgError);
        throw new Error("Failed to create organization.");
      }
      console.log("Organization created:", orgId);

      // Step 3: Create membership as owner
      console.log("Step 3: Creating membership...");
      const { error: membershipError } = await supabase
        .from("organization_memberships")
        .insert({
          organization_id: orgId,
          user_id: user.id,
          role: "owner",
        });

      if (membershipError) {
        if (import.meta.env.DEV) console.error("Failed to create membership:", membershipError);
        throw new Error("Failed to create membership.");
      }
      console.log("Membership created");

      // Step 4: Seed default reference data
      console.log("Step 4: Seeding default data...");
      const { error: seedError } = await supabase
        .rpc("seed_organization_defaults", { p_organization_id: orgId });

      if (seedError) {
        if (import.meta.env.DEV) console.error("Failed to seed defaults:", seedError);
        toast.error("Organization created but some default data may be missing.");
      } else {
        console.log("Default data seeded");
      }

      console.log("Step 5: Completing setup...");
      await queryClient.invalidateQueries({ queryKey: ["organizations"] });

      toast.success(`Welcome to ${companyName}. Your invite code is: ${generatedCode}`);

      // Force a page reload to ensure clean state
      window.location.href = "/";
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("Organization creation failed:", error);
      toast.error(getUserFriendlyError(error, "Organization creation"));
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to join an organization.");
      return;
    }

    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_organization_by_invite_code" as any, {
        p_invite_code: inviteCode.trim(),
      });

      if (error) {
        if (error.message?.includes("Invalid invite code")) {
          throw new Error("Invalid invite code. Please check and try again.");
        }
        throw error;
      }

      const org = Array.isArray(data) ? data[0] : data;
      if (!org) {
        throw new Error("Invalid invite code. Please check and try again.");
      }

      await queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success(`Welcome to ${org.name}.`);
      window.location.href = "/";
    } catch (error: any) {
      toast.error(getUserFriendlyError(error, "Join organization"));
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is initializing
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

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
                    disabled={loading}
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
                  disabled={loading || !companyName.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Organization"
                  )}
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
                    disabled={loading}
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
                  disabled={loading || !inviteCode.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Organization"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <div className="px-6 pb-6 pt-2 text-center">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="text-sm text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </Card>
    </div>
  );
}
