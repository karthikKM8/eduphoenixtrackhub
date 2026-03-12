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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const statusLabel = checkedIn ? (canCheckOut ? "Ready to check out" : "Checked in") : "Not checked in";
  const statusTone = checkedIn ? "text-success" : "text-muted-foreground";

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
          if (result.checkInTime) {
            const elapsed = Date.now() - new Date(result.checkInTime).getTime();
            const remaining = Math.max(0, 330 * 60 * 1000 - elapsed);
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
      });
      if (result.success) {
        setCheckedIn(true);
        setTimer(330 * 60);
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

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Header with Welcome Banner */}
        <div className="mb-8 space-y-6">
          {/* Welcome Card */}
          <div className="dashboard-panel group rounded-2xl sm:rounded-3xl md:rounded-[32px] p-5 sm:p-6 md:p-8 lg:p-10 transition-all duration-300 hover:shadow-lg">
            <div className="flex flex-col gap-4 sm:gap-5 md:gap-6 lg:gap-8 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2 sm:space-y-3">
                <div className="inline-flex items-center gap-2 sm:gap-3 rounded-full bg-primary/15 px-3 py-1.5 sm:px-4 sm:py-2">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-primary text-primary" />
                  <span className="text-xs sm:text-sm font-semibold text-primary uppercase tracking-wider">Instructor Portal</span>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-10 sm:h-12 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl object-contain" />
                    <div>
                      <p className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                        {greeting}
                      </p>
                      <p className="text-base sm:text-lg text-muted-foreground">{employeeName}</p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{currentDate}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="rounded-xl sm:rounded-2xl md:rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4">
                  <p className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className={`h-2 w-2 rounded-full animate-pulse ${checkedIn ? 'bg-success' : 'bg-warning'}`} />
                    Status
                  </p>
                  <p className={`mt-2 font-display text-lg sm:text-xl md:text-2xl font-bold ${statusTone}`}>{statusLabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="dashboard-panel group rounded-lg sm:rounded-xl md:rounded-[24px] p-4 sm:p-5 md:p-6 transition-all duration-300 hover:bg-white/80 cursor-default">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> Access Level
                  </p>
                  <p className="mt-2 sm:mt-3 font-display text-xl sm:text-2xl font-bold">Instructor</p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Full attendance control</p>
                </div>
                <div className="rounded-lg sm:rounded-xl bg-primary/10 p-2 sm:p-3 flex-shrink-0">
                  <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="dashboard-panel group rounded-lg sm:rounded-xl md:rounded-[24px] p-4 sm:p-5 md:p-6 transition-all duration-300 hover:bg-white/80 cursor-default">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Layers3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> Assigned Domains
                  </p>
                  <p className="mt-2 sm:mt-3 font-display text-xl sm:text-2xl font-bold">{jobRoles.length}</p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Training areas</p>
                </div>
                <div className="rounded-lg sm:rounded-xl bg-primary/10 p-2 sm:p-3 flex-shrink-0">
                  <Layers3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
            </div>

            <div className="dashboard-panel group rounded-lg sm:rounded-xl md:rounded-[24px] p-4 sm:p-5 md:p-6 transition-all duration-300 hover:bg-white/80 cursor-default">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" /> Session Time
                  </p>
                  <p className="mt-2 sm:mt-3 font-display text-xl sm:text-2xl font-bold">{checkedIn ? (canCheckOut ? "Ready" : formatTime(timer)) : "—"}</p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{checkedIn ? (canCheckOut ? "Checkout available" : "Until checkout") : "Not active"}</p>
                </div>
                <div className="rounded-lg sm:rounded-xl bg-primary/10 p-2 sm:p-3 flex-shrink-0">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 sm:gap-5 md:gap-6 lg:grid-cols-3">
          {/* Left Column - Check-in/out (2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
            {/* Attendance Card - Large & Prominent */}
            <div className="dashboard-panel overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[32px] bg-gradient-to-br from-white/80 to-white/60">
              <div className="border-b border-border/60 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6">
                <h2 className="font-display text-2xl sm:text-3xl font-bold">Daily Attendance</h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground">Manage your session and keep your workspace active</p>
              </div>

              <div className="space-y-4 sm:space-y-5 md:space-y-6 p-4 sm:p-6 md:p-8">
                {!checkedIn ? (
                  <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[28px] border-2 border-primary/30 bg-gradient-to-br from-primary/20 via-white to-accent/10 p-5 sm:p-6 md:p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                    <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
                    <div className="relative z-10">
                      <div className="mb-4 sm:mb-5 md:mb-6 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
                        <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-white shadow-lg">
                          <LogIn className="h-6 w-6 sm:h-7 sm:w-7" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display text-xl sm:text-2xl font-bold">Ready to Start?</h3>
                          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">Check in to activate your instructor workspace and start managing student attendance for today.</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleCheckIn}
                        className="h-11 sm:h-12 md:h-14 w-full gap-2 sm:gap-3 rounded-lg sm:rounded-2xl md:rounded-[20px] bg-gradient-to-r from-primary to-primary/80 text-sm sm:text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        disabled={submitting}
                      >
                        <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
                        {submitting ? "Checking in..." : "Check In Now"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Session Status Cards */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                      <div className="group rounded-lg sm:rounded-2xl md:rounded-[24px] border-2 border-success/30 bg-gradient-to-br from-success/15 to-success/5 p-4 sm:p-5 md:p-6 transition-all duration-300 hover:border-success/50 hover:shadow-md">
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                              <span className="text-sm sm:text-base font-semibold text-success">Session Active</span>
                            </div>
                            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground">Your instructor workspace is fully operational. You can manage attendance verification and student records.</p>
                          </div>
                          <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-success/50 flex-shrink-0" />
                        </div>
                      </div>

                      <div className="group rounded-lg sm:rounded-2xl md:rounded-[24px] border-2 border-warning/30 bg-gradient-to-br from-warning/15 to-warning/5 p-4 sm:p-5 md:p-6 transition-all duration-300 hover:border-warning/50 hover:shadow-md">
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                              <span className="text-sm sm:text-base font-semibold text-warning">Available Check-out</span>
                            </div>
                            <p className="font-display text-lg sm:text-xl font-bold text-foreground mt-2">{canCheckOut ? "Now Available ✓" : formatTime(timer)}</p>
                            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">{canCheckOut ? "You can close your session now." : "Wait for the cooldown period to complete."}</p>
                          </div>
                          <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-warning/50 flex-shrink-0" />
                        </div>
                      </div>
                    </div>

                    {/* Check-out Button */}
                    <Button
                      onClick={handleCheckOut}
                      className={`h-11 sm:h-12 md:h-14 w-full gap-2 sm:gap-3 rounded-lg sm:rounded-2xl md:rounded-[20px] text-sm sm:text-base font-semibold transition-all duration-300 ${
                        canCheckOut
                          ? "bg-gradient-to-r from-destructive/90 to-destructive text-white shadow-lg hover:shadow-xl"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                      disabled={!canCheckOut || submitting}
                    >
                      <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                      {submitting ? "Checking out..." : canCheckOut ? "End Session" : "Waiting..."}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Domains Card */}
            <div className="dashboard-panel rounded-2xl sm:rounded-3xl md:rounded-[28px] p-4 sm:p-6 md:p-8">
              <div className="mb-4 sm:mb-5 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
                <div>
                  <h3 className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 font-display text-xl sm:text-2xl font-bold">
                    <Briefcase className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Your Training Domains
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground">Students visible to you are filtered by these assignments</p>
                </div>
              </div>

              {jobRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {jobRoles.map((role, idx) => (
                    <div
                      key={role}
                      className="group cursor-default rounded-full border border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 px-4 sm:px-5 py-2 sm:py-3 transition-all duration-300 hover:border-primary/50 hover:shadow-md"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <span className="text-xs sm:text-sm font-semibold text-foreground">{role}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg sm:rounded-2xl md:rounded-[20px] border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 sm:p-5 md:p-6 text-center">
                  <Briefcase className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-xs sm:text-sm text-muted-foreground">No job roles assigned yet. Contact your administrator for domain access.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Actions & Info */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* Primary Action Card */}
            <div className="dashboard-panel group relative overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[28px] bg-gradient-to-br from-primary/10 to-accent/5 p-5 sm:p-6 md:p-8 transition-all duration-300 hover:shadow-lg">
              <div className="relative z-10">
                <div className="mb-4 sm:mb-5 md:mb-6 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg sm:rounded-2xl bg-primary text-white shadow-lg">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold">Student Verification</h3>
                <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">Access the verification workspace to view all student logs, verify attendance, and manage attendance history by college grouping.</p>
                {jobRoles.length > 0 ? (
                  <Button
                    onClick={() => navigate("internlogs")}
                    className="mt-4 sm:mt-5 md:mt-6 h-11 sm:h-12 w-full gap-2 rounded-lg sm:rounded-2xl md:rounded-[18px] bg-primary text-white hover:shadow-lg transition-all duration-300 font-semibold text-sm sm:text-base"
                  >
                    <Eye className="h-4 w-4" /> View Logs & Verify
                  </Button>
                ) : (
                  <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-2xl md:rounded-[14px] border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 sm:px-4 sm:py-3 text-center text-xs sm:text-sm text-muted-foreground">
                    Assign domains to access logs
                  </div>
                )}
              </div>
            </div>

            {/* Device Info Card */}
            <div className="dashboard-panel rounded-2xl sm:rounded-3xl md:rounded-[28px] p-5 sm:p-6 md:p-8">
              <h3 className="mb-3 sm:mb-4 md:mb-6 font-display text-base sm:text-lg font-bold flex items-center gap-2">
                <GripHorizontal className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Device Session
              </h3>
              <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm">
                <div className="rounded-lg sm:rounded-2xl md:rounded-[16px] border border-border/60 bg-white/50 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browser</p>
                  <p className="mt-1 sm:mt-2 font-semibold text-foreground">{deviceInfo.browser || "Unknown"}</p>
                </div>
                <div className="rounded-lg sm:rounded-2xl md:rounded-[16px] border border-border/60 bg-white/50 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operating System</p>
                  <p className="mt-1 sm:mt-2 font-semibold text-foreground">{deviceInfo.os || "Unknown"}</p>
                </div>
                <div className="rounded-lg sm:rounded-2xl md:rounded-[16px] border border-border/60 bg-white/50 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Device Type</p>
                  <p className="mt-1 sm:mt-2 font-semibold text-foreground">{deviceInfo.deviceType || "Unknown"}</p>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="dashboard-panel rounded-2xl sm:rounded-3xl md:rounded-[28px] p-4 sm:p-5 md:p-6 space-y-2 sm:space-y-3">
              <Dialog open={pwDialogOpen} onOpenChange={(open) => { setPwDialogOpen(open); if (!open) setPwForm({ current: "", newPw: "", confirm: "" }); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-11 sm:h-12 w-full gap-2 rounded-lg sm:rounded-2xl md:rounded-[18px] hover:bg-muted text-sm sm:text-base">
                    <KeyRound className="h-4 w-4" /> Change Password
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-sm rounded-2xl sm:rounded-3xl md:rounded-[28px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Secure Your Account</DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm">Update your password to keep your account secure</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-pw" className="font-semibold text-sm">Current Password</Label>
                      <Input
                        id="current-pw"
                        type="password"
                        value={pwForm.current}
                        onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
                        required
                        placeholder="••••••••"
                        className="h-10 sm:h-11 rounded-lg sm:rounded-[12px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pw" className="font-semibold text-sm">New Password</Label>
                      <Input
                        id="new-pw"
                        type="password"
                        value={pwForm.newPw}
                        onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))}
                        required
                        placeholder="Min. 6 characters"
                        className="h-10 sm:h-11 rounded-lg sm:rounded-[12px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-pw" className="font-semibold text-sm">Confirm Password</Label>
                      <Input
                        id="confirm-pw"
                        type="password"
                        value={pwForm.confirm}
                        onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                        required
                        placeholder="••••••••"
                        className="h-10 sm:h-11 rounded-lg sm:rounded-[12px]"
                      />
                    </div>
                    <Button type="submit" className="h-10 sm:h-11 w-full gap-2 rounded-lg sm:rounded-[14px] text-sm sm:text-base" disabled={pwLoading}>
                      {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      {pwLoading ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="h-11 sm:h-12 w-full gap-2 rounded-lg sm:rounded-2xl md:rounded-[18px] border-destructive/30 text-destructive hover:bg-destructive/5 text-sm sm:text-base"
              >
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>

            {/* Tips Card */}
            <div className="dashboard-panel rounded-2xl sm:rounded-3xl md:rounded-[28px] bg-gradient-to-br from-accent/10 to-accent/5 p-4 sm:p-5 md:p-6">
              <h3 className="mb-3 sm:mb-4 font-display font-bold flex items-center gap-2 text-base sm:text-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /> Quick Tips
              </h3>
              <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2">
                  <span className="mt-0.5 sm:mt-1 shrink-0 rounded-full bg-accent/30 px-2 py-0.5 text-accent text-xs font-bold">1</span>
                  <span>Check in to start managing attendance for the day</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 sm:mt-1 shrink-0 rounded-full bg-accent/30 px-2 py-0.5 text-accent text-xs font-bold">2</span>
                  <span>Click student names to view full attendance history</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 sm:mt-1 shrink-0 rounded-full bg-accent/30 px-2 py-0.5 text-accent text-xs font-bold">3</span>
                  <span>Filter by college for quick grouping and verification</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
