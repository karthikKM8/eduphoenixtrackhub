import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.login(form.email, form.password);
      if (result.success) {
        if (result.role === "employee") {
          localStorage.setItem("employee_token", result.token);
          localStorage.setItem("employee_name", result.name);
          localStorage.setItem("employee_email", form.email);
          localStorage.setItem("employee_jobRoles", JSON.stringify(result.jobRoles || []));
          toast({ title: "Welcome!", description: `Logged in as ${result.name}` });
          navigate("/employee/dashboard");
        } else {
          localStorage.setItem("admin_token", result.token);
          localStorage.setItem("admin_role", result.role);
          toast({ title: "Welcome!", description: `Logged in as ${result.role}` });
          navigate("/admin/dashboard");
        }
      } else {
        toast({ title: "Login Failed", description: result.error || "Invalid credentials", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-shell flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="dashboard-mesh pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-32 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-[100px] animate-pulse" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-emerald-500/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-sm relative z-10">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="p-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="font-medium">Back to Home</span>
        </button>

        <Card className="dashboard-panel animate-fade-in p-2 sm:p-4 shadow-2xl border-white/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3">
              <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-14 object-contain mx-auto" />
            </div>
            <CardTitle className="font-display text-2xl font-bold">Login</CardTitle>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  placeholder="user@eduphoenix.com"
                  className="bg-background/50 backdrop-blur-sm focus:bg-background transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    required
                    placeholder="••••••••"
                    className="pr-10 bg-background/50 backdrop-blur-sm focus:bg-background transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98] text-white" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
