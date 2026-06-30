import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogIn,
  LogOut,
  CheckCircle2,
  Clock,
  Briefcase,
  KeyRound,
  Loader2,
  FileText,
  Sparkles,
  ShieldCheck,
  Layers3,
  Activity,
  TrendingUp,
  Eye,
  Star,
  GripHorizontal,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { api } from "@/lib/api";

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [canCheckOut, setCanCheckOut] = useState(false);
  const [timer, setTimer] = useState(0);
  const [jobRoles, setJobRoles] = useState<string[]>([]);
  const [autoCheckout, setAutoCheckout] = useState(false);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);

  const employeeName = localStorage.getItem("employee_name") || "Employee";
  const employeeEmail = localStorage.getItem("employee_email") || "";
  const employeeToken = localStorage.getItem("employee_token");
  const deviceInfo = getDeviceInfo();
  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : currentHour < 22 ? "Good Evening" : "Good Night";
  const statusLabel = checkedIn ? (canCheckOut ? "Ready to check out" : "Checked in") : "Not checked in";
  const statusTone = checkedIn ? "text-success" : "text-muted-foreground";

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  useEffect(() => {
    if (!employeeToken) {
      navigate("/employee");
      return;
    }

    // Load job roles from localStorage as fallback
    const storedRoles = JSON.parse(localStorage.getItem("employee_jobRoles") || "[]");
    setJobRoles(storedRoles);

    const checkStatus = async () => {
      try {
        // Fetch fresh job roles from database in case they were recently assigned
        const rolesResult = await api.getEmployeeJobRoles(employeeEmail);
        if (rolesResult.success && rolesResult.jobRoles && rolesResult.jobRoles.length > 0) {
          setJobRoles(rolesResult.jobRoles);
          // Update localStorage with fresh data
          localStorage.setItem("employee_jobRoles", JSON.stringify(rolesResult.jobRoles));
        }

        const result = await api.employeeStatus(deviceInfo.fingerprint);
        if (result.checkedIn) {
          setCheckedIn(true);
          if (result.autoCheckout) {
            setAutoCheckout(true);
          }
          if (result.checkInTime) {
            const now = new Date();
            const istDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' });
            const [month, day, year] = istDateStr.split('/');
            const targetTimeMs = new Date(`${year}-${month}-${day}T19:00:00+05:30`).getTime();
            const remaining = Math.max(0, targetTimeMs - Date.now());
            if (remaining <= 0) {
              setCanCheckOut(true);
            } else {
              setTimer(Math.ceil(remaining / 1000));
            }
          }
        }
      } catch {
        console.error("Error checking employee status");
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, [employeeToken, employeeEmail]);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          setCanCheckOut(true);
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (canCheckOut && autoCheckout && checkedIn) {
      handleCheckOut();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCheckOut, autoCheckout, checkedIn]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      const result = await api.employeeCheckIn(deviceInfo.fingerprint, {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
        autoCheckout,
      });
      if (result.success) {
        setCheckedIn(true);
        const now = new Date();
        const istDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", year: 'numeric', month: '2-digit', day: '2-digit' });
        const [month, day, year] = istDateStr.split('/');
        const targetTimeMs = new Date(`${year}-${month}-${day}T19:00:00+05:30`).getTime();
        const remaining = Math.max(0, targetTimeMs - Date.now());
        if (remaining <= 0) {
          setCanCheckOut(true);
        } else {
          setTimer(Math.ceil(remaining / 1000));
        }
        toast({ title: "Checked In!", description: "You have been checked in successfully." });
      } else {
        toast({ title: "Error", description: result.error || "Check-in failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      const result = await api.employeeCheckOut(deviceInfo.fingerprint);
      if (result.success) {
        setCheckedIn(false);
        setCanCheckOut(false);
        toast({ title: "Checked Out!", description: "See you next time!" });
      } else {
        toast({ title: "Error", description: result.error || "Check-out failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (pwForm.newPw.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const result = await api.changePassword(employeeEmail, pwForm.current, pwForm.newPw);
      if (result.success) {
        toast({ title: "Password Changed", description: "Your password has been updated successfully." });
        setPwDialogOpen(false);
        setPwForm({ current: "", newPw: "", confirm: "" });
      } else {
        toast({ title: "Error", description: result.error || "Failed to change password.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("employee_token");
    localStorage.removeItem("employee_name");
    localStorage.removeItem("employee_email");
    navigate("/employee");
  };

  if (loading) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell relative min-h-screen overflow-hidden bg-background px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-8 lg:px-8">
      {/* Animated Background Elements - Hidden on mobile for performance */}
      <div className="dashboard-mesh pointer-events-none absolute inset-0 opacity-40 hidden sm:block" />
      <div className="pointer-events-none absolute -left-32 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-pulse hidden md:block" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent/15 blur-3xl animate-pulse hidden lg:block" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-pulse hidden xl:block" style={{ animationDelay: '0.5s' }} />

      <div className="relative mx-auto w-full max-w-[1600px] h-full">
        {/* Modern Bento Box Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
          
          {/* 1. Welcome Bento Box (Span 8) */}
          <div className="dashboard-panel md:col-span-12 lg:col-span-8 group rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col justify-between overflow-hidden relative border-white/10 bg-gradient-to-br from-white/10 to-transparent">
            {/* Background decoration */}
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl transition-transform duration-700 group-hover:scale-110" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <img src="/logo.jpeg" alt="EduPhoenix" className="h-10 sm:h-12 object-contain rounded-lg shadow-md" />
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/20 backdrop-blur-md px-4 py-1.5 border border-primary/20">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">Instructor Portal</span>
                  </div>
                </div>
                <div>
                  <p className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent pb-2 pr-2 overflow-visible">
                    {greeting},
                  </p>
                  <p className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-blue-500 mt-1">{employeeName}</p>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground font-medium bg-foreground/5 w-fit px-4 py-2 rounded-xl backdrop-blur-md border border-border">{currentDate}</p>
              </div>

              <div className="flex-shrink-0">
                <div className="rounded-[24px] border border-border bg-foreground/5 backdrop-blur-md px-6 py-5 text-center min-w-[180px]">
                  <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] animate-pulse ${checkedIn ? 'bg-success shadow-success/50' : 'bg-warning shadow-warning/50'}`} />
                    Status
                  </p>
                  <p className={`font-display text-xl sm:text-2xl font-bold ${statusTone}`}>{statusLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Verification Action Box (Span 4) */}
          <div className="dashboard-panel md:col-span-12 lg:col-span-4 group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10 p-6 sm:p-8 flex flex-col justify-center text-center items-center hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.3)] transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-foreground/5" />
            <div className="relative z-10 w-full flex flex-col items-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-primary to-accent shadow-2xl group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                <Eye className="h-10 w-10 text-primary-foreground" />
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">Student Logs</h3>
              <p className="text-sm text-foreground/70 mb-8 max-w-[250px]">Access the verification workspace to manage attendance history.</p>
              
              {jobRoles.length > 0 ? (
                <Button
                  onClick={() => navigate("internlogs")}
                  className="h-14 w-full gap-3 rounded-[20px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl transition-all duration-300 font-bold text-lg"
                >
                  <Eye className="h-5 w-5" /> Verify Attendance
                </Button>
              ) : (
                <div className="w-full rounded-[20px] border border-dashed border-border bg-foreground/5 px-4 py-4 text-sm text-foreground/60 backdrop-blur-sm">
                  Assign domains to access
                </div>
              )}
            </div>
          </div>

          {/* 3. Daily Attendance (Span 6) */}
          <div className="dashboard-panel md:col-span-12 lg:col-span-6 rounded-3xl p-6 sm:p-8 flex flex-col">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Session Control</h2>
                <p className="text-sm text-muted-foreground">Manage your daily workspace session</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {!checkedIn ? (
                <div className="flex flex-col items-center text-center space-y-6">
                  <p className="text-base text-muted-foreground max-w-[350px]">Ready to activate your instructor workspace and start managing student attendance?</p>
                  <div className="flex items-center space-x-3 bg-foreground/5 px-6 py-3 rounded-full border border-border">
                    <Checkbox id="auto-checkout" checked={autoCheckout} onCheckedChange={(checked) => setAutoCheckout(checked as boolean)} className="data-[state=checked]:bg-primary" />
                    <label htmlFor="auto-checkout" className="text-sm font-medium text-foreground/80 cursor-pointer">Auto check out at 7:00 PM</label>
                  </div>
                  <Button
                    onClick={handleCheckIn}
                    className="h-16 w-full max-w-[350px] gap-3 rounded-[24px] bg-gradient-to-r from-primary to-accent text-lg font-bold text-primary-foreground shadow-[0_0_30px_-5px_rgba(var(--primary),0.5)] hover:shadow-[0_0_40px_-5px_rgba(var(--primary),0.7)] transition-all duration-300 hover:scale-105"
                    disabled={submitting}
                  >
                    <LogIn className="h-6 w-6" /> {submitting ? "Checking in..." : "Start Session"}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full h-full">
                  <div className="flex flex-col justify-center items-center text-center rounded-[24px] bg-success/10 border border-success/20 p-6">
                    <CheckCircle2 className="h-12 w-12 text-success mb-4" />
                    <span className="text-lg font-bold text-success mb-1">Session Active</span>
                    <span className="text-xs text-success/70">Workspace operational</span>
                  </div>
                  <div className="flex flex-col justify-center items-center text-center rounded-[24px] bg-warning/10 border border-warning/20 p-6">
                    <Clock className="h-12 w-12 text-warning mb-4" />
                    <span className="text-2xl font-display font-bold text-foreground mb-1">{canCheckOut ? "Available" : formatTime(timer)}</span>
                    <span className="text-xs text-warning/70">{canCheckOut ? "Ready to end session" : "Cooldown active"}</span>
                  </div>
                  <Button
                    onClick={handleCheckOut}
                    className={`col-span-1 sm:col-span-2 h-14 w-full gap-3 rounded-[20px] text-lg font-bold transition-all duration-300 mt-2 ${
                      canCheckOut ? "bg-destructive text-destructive-foreground shadow-[0_0_30px_-5px_rgba(var(--destructive),0.5)] hover:bg-destructive/90 hover:scale-[1.02]" : "bg-foreground/10 text-foreground/30 cursor-not-allowed"
                    }`}
                    disabled={!canCheckOut || submitting}
                  >
                    <LogOut className="h-5 w-5" /> {submitting ? "Ending..." : canCheckOut ? "End Session" : "Waiting for Cooldown..."}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 4. Assigned Domains (Span 6) */}
          <div className="dashboard-panel md:col-span-12 lg:col-span-6 rounded-3xl p-6 sm:p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Briefcase className="h-40 w-40 text-foreground" />
            </div>
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-border relative z-10">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Assigned Domains</h2>
                <p className="text-sm text-muted-foreground">Your configured training areas</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-black/30 border border-white/10 flex items-center justify-center">
                <span className="font-bold text-lg text-primary">{jobRoles.length}</span>
              </div>
            </div>

            <div className="flex-1 relative z-10 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
              {jobRoles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {jobRoles.map((role, idx) => (
                    <div
                      key={role}
                      className="group flex items-center gap-3 rounded-2xl border border-border bg-foreground/5 p-4 transition-all duration-300 hover:border-primary/30 hover:bg-primary/5"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="h-2 w-2 rounded-full bg-primary group-hover:shadow-[0_0_10px_rgba(var(--primary),1)]" />
                      <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground line-clamp-2">{role}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-3xl">
                  <Layers3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No domains assigned. Contact administration.</p>
                </div>
              )}
            </div>
          </div>

          {/* 5. Small Stat - Session Time (Span 4) */}
          <div className="dashboard-panel md:col-span-4 rounded-3xl p-6 flex flex-col justify-center items-center text-center group hover:-translate-y-1 transition-transform duration-300">
            <div className="h-14 w-14 rounded-full bg-accent/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Session Time</p>
            <p className="font-display text-3xl font-bold text-foreground">{checkedIn ? (canCheckOut ? "Ready" : formatTime(timer)) : "—"}</p>
          </div>

          {/* 6. Device Session (Span 4) */}
          <div className="dashboard-panel md:col-span-4 rounded-3xl p-6 flex flex-col justify-between">
            <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4 text-foreground">
              <GripHorizontal className="h-5 w-5 text-primary" /> Device Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-xs text-muted-foreground">Browser</span>
                <span className="text-sm font-medium text-foreground">{deviceInfo.browser || "Unknown"}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-xs text-muted-foreground">OS</span>
                <span className="text-sm font-medium text-foreground">{deviceInfo.os || "Unknown"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Type</span>
                <span className="text-sm font-medium text-foreground">{deviceInfo.deviceType || "Unknown"}</span>
              </div>
            </div>
          </div>

          {/* 7. Account Actions (Span 4) */}
          <div className="dashboard-panel md:col-span-4 rounded-3xl p-6 flex flex-col justify-center gap-4">
            <h3 className="font-display text-lg font-bold text-foreground text-center mb-2">Account Settings</h3>
            
            <Dialog open={pwDialogOpen} onOpenChange={(open) => { setPwDialogOpen(open); if (!open) setPwForm({ current: "", newPw: "", confirm: "" }); }}>
              <DialogTrigger asChild>
                <Button className="h-12 w-full gap-2 rounded-[16px] bg-foreground/5 hover:bg-foreground/10 border border-border text-foreground transition-all">
                  <KeyRound className="h-4 w-4" /> Change Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-[28px] border-border bg-background/90 backdrop-blur-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display text-center">Secure Account</DialogTitle>
                  <DialogDescription className="text-center text-muted-foreground">Update your credentials</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="mt-4 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Current Password</Label>
                    <Input type="password" value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} required className="h-12 bg-foreground/5 border-border rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">New Password</Label>
                    <Input type="password" value={pwForm.newPw} onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))} required className="h-12 bg-foreground/5 border-border rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground/80">Confirm Password</Label>
                    <Input type="password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required className="h-12 bg-foreground/5 border-border rounded-xl" />
                  </div>
                  <Button type="submit" className="h-12 w-full rounded-xl bg-primary text-primary-foreground font-bold" disabled={pwLoading}>
                    {pwLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update Password"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={handleLogout} className="h-12 w-full gap-2 rounded-[16px] bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 transition-all">
              <LogOut className="h-4 w-4" /> Logout Account
            </Button>
            
            <Button onClick={toggleTheme} variant="outline" className="h-12 w-full gap-2 rounded-[16px] border-border bg-background/50 hover:bg-background/80 text-foreground transition-all">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} 
              Switch to {isDark ? "Light" : "Dark"} Theme
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
