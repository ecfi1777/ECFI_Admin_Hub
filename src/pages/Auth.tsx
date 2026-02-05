import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { HardHat, Eye, EyeOff, Mail, CheckCircle } from "lucide-react";
import { PasswordStrength, getPasswordStrength } from "@/components/ui/password-strength";
import { getUserFriendlyError } from "@/lib/errorHandler";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid } = getPasswordStrength(password);
    if (!isValid) {
      toast({
        title: "Password too weak",
        description: "Please meet at least 4 of the 5 password requirements.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      toast({
        title: "Sign up failed",
        description: getUserFriendlyError(error, "Auth"),
        variant: "destructive",
      });
    } else {
      // Clear form and show success state
      setEmail("");
      setPassword("");
      setDisplayName("");
      setSignupSuccess(true);
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Sign in failed",
        description: getUserFriendlyError(error, "Auth"),
        variant: "destructive",
      });
      setLoading(false);
    }
    // On success, auth state change will trigger redirect via AuthRoute
    // Don't set loading to false here - let the redirect happen
  };

  const handleTabChange = (value: string) => {
    // Reset success state when switching tabs
    if (value === "signup") {
      setSignupSuccess(false);
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
            <CardTitle className="text-2xl font-bold text-white">ECFI Hub</CardTitle>
            <CardDescription className="text-slate-400">
              Project & Schedule Management
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="signin" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900">
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-slate-300">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-slate-300">Password</Label>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-amber-500 hover:text-amber-400"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {signupSuccess ? (
                <div className="mt-4 p-6 text-center space-y-4">
                  <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Mail className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Check Your Email
                    </h3>
                    <p className="text-slate-400 text-sm">
                      We've sent a confirmation link to your email address. 
                      Please click the link to verify your account and complete the signup process.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => setSignupSuccess(false)}
                  >
                    Back to Sign Up
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-slate-300">Display Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-300">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-slate-700 border-slate-600 text-white pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
