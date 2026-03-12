import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Briefcase, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("admin");
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "admin") {
        const result = await api.adminLogin(form.email, form.password);
        if (result.success) {
          localStorage.setItem("admin_token", result.token);
          localStorage.setItem("admin_role", result.role);
          toast({ title: "Welcome!", description: `Logged in as ${result.role}` });
          navigate("/admin/dashboard");
        } else {
          toast({ title: "Login Failed", description: result.error || "Invalid credentials", variant: "destructive" });
        }
      } else {
        const result = await api.employeeLogin(form.email, form.password);
        if (result.success) {
          localStorage.setItem("employee_token", result.token);
          localStorage.setItem("employee_name", result.name);
          localStorage.setItem("employee_email", form.email);
          localStorage.setItem("employee_jobRoles", JSON.stringify(result.jobRoles || []));
          toast({ title: "Welcome!", description: `Logged in as ${result.name}` });
          navigate("/employee/dashboard");
        } else {
          toast({ title: "Login Failed", description: result.error || "Invalid credentials", variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setTab(value);
    setForm({ email: "", password: "" });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-hero px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground/70 hover:text-primary-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>

        <Card className="shadow-card animate-fade-in">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3">
              <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-14 object-contain mx-auto" />
            </div>
            <CardTitle className="font-display text-2xl">Login</CardTitle>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="admin" className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Admin
                </TabsTrigger>
                <TabsTrigger value="employee" className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Employee
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      required
                      placeholder="admin@org.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        required
                        placeholder="••••••••"
                        className="pr-10"
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    {loading ? "Signing in..." : "Sign In as Admin"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="employee">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-email">Email</Label>
                    <Input
                      id="emp-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      required
                      placeholder="employee@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="emp-password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        required
                        placeholder="••••••••"
                        className="pr-10"
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
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Briefcase className="h-4 w-4 mr-2" />}
                    {loading ? "Signing in..." : "Sign In as Employee"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
