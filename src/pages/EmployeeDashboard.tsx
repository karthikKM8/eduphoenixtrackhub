import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn, LogOut, CheckCircle2, Clock, Briefcase, KeyRound, Loader2, FileText } from "lucide-react";
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
            const remaining = Math.max(0, 45 * 60 * 1000 - elapsed);
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
        setTimer(45 * 60);
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="flex items-center gap-1">
            <Dialog open={pwDialogOpen} onOpenChange={(open) => { setPwDialogOpen(open); if (!open) setPwForm({ current: "", newPw: "", confirm: "" }); }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <KeyRound className="h-4 w-4 mr-1" /> Password
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Enter your current password and a new password.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-pw">Current Password</Label>
                    <Input id="current-pw" type="password" value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} required placeholder="••••••••" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw">New Password</Label>
                    <Input id="new-pw" type="password" value={pwForm.newPw} onChange={(e) => setPwForm((p) => ({ ...p, newPw: e.target.value }))} required placeholder="Min. 6 characters" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pw">Confirm New Password</Label>
                    <Input id="confirm-pw" type="password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} required placeholder="••••••••" />
                  </div>
                  <Button type="submit" className="w-full" disabled={pwLoading}>
                    {pwLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                    {pwLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>

        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <div className="mb-3">
              <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-12 object-contain" />
            </div>
            <CardTitle className="font-display text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary-foreground" />
              </div>
              Welcome, {employeeName}!
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Daily Attendance</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                  Daily Attendance
                </h4>
                {!checkedIn ? (
                  <Button
                    onClick={handleCheckIn}
                    className="w-full gap-2 gradient-primary text-primary-foreground hover:opacity-90 h-12 text-base"
                    disabled={submitting}
                  >
                    <LogIn className="h-5 w-5" />
                    {submitting ? "Checking in..." : "Check In"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-success/10 p-4 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span className="font-medium text-success">You are checked in</span>
                    </div>
                    {!canCheckOut && timer > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-4 text-sm">
                        <Clock className="h-5 w-5 text-warning" />
                        <span className="text-warning font-medium">
                          Check-out available in {formatTime(timer)}
                        </span>
                      </div>
                    )}
                    <Button
                      onClick={handleCheckOut}
                      variant="outline"
                      className="w-full gap-2 h-12 text-base"
                      disabled={!canCheckOut || submitting}
                    >
                      <LogOut className="h-5 w-5" />
                      {submitting ? "Checking out..." : "Check Out"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t pt-6 space-y-3">
                <h4 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Your Domains
                </h4>
                {jobRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {jobRoles.map((role) => (
                      <div key={role} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                        {role}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No job roles assigned yet. Contact your administrator.</p>
                )}
              </div>

              <div className="border-t pt-6">
                <h4 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
                  Quick Actions
                </h4>
                {jobRoles.length > 0 ? (
                  <Button
                    onClick={() => navigate("internlogs")}
                    variant="outline"
                    className="w-full gap-2 h-11"
                  >
                    <FileText className="h-4 w-4" />
                    View Student Logs & Verify Attendance
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Assign job roles to access student logs</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
