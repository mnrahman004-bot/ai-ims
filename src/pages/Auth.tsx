import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Package } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;

    if (score <= 2) return { score: score * 20, label: "Weak", color: "text-destructive" };
    if (score <= 3) return { score: 60, label: "Fair", color: "text-[hsl(var(--warning))]" };
    if (score <= 4) return { score: 80, label: "Good", color: "text-primary" };
    return { score: 100, label: "Strong", color: "text-[hsl(var(--success))]" };
  }, [password]);

  const isPasswordValid = /^[a-zA-Z0-9]+$/.test(password) && password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast({ title: "Invalid password", description: "Password must be at least 6 characters and contain only letters and numbers (alphanumeric).", variant: "destructive" });
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) {
        toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account created!", description: "You can now log in." });
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Package className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription>
            {isLogin ? "Sign in to your inventory dashboard" : "Set up your inventory system"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shop.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^[a-zA-Z0-9]*$/.test(val)) {
                    setPassword(val);
                  }
                }}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">Only letters and numbers (alphanumeric)</p>
              {password && (
                <div className="space-y-1">
                  <Progress value={passwordStrength.score} className="h-1.5" />
                  <p className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
