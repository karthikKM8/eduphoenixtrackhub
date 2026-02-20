import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, LogIn, LogOut, CheckCircle2, Clock, AlertTriangle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { api } from "@/lib/api";

const INTERNSHIP_DOMAINS = [
  "Full Stack Development Internship",
  "Data Science with Python Internship",
  "Machine Learning with Python Internship",
  "Cyber Security Internship",
  "3D Printing Internship",
  "IoT Internship",
  "VLSI Design Internship",
  "Civil Engineering Internship",
  "Human Resources (HR) Internship",
  "Financial Modelling Internship",
  "Digital Marketing Internship",
  "Public Relations Internship",
  "Other",
];

type InternData = {
  name: string;
  contact: string;
  college: string;
  domain: string;
};

type FeeDue = {
  id: string;
  amount: number;
  message: string;
};

const InternForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [canCheckOut, setCanCheckOut] = useState(false);
  const [timer, setTimer] = useState(0);
  const [feeDue, setFeeDue] = useState<FeeDue | null>(null);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [showPersistentFeeNotification, setShowPersistentFeeNotification] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [foundData, setFoundData] = useState<InternData | null>(null);
  const [foundDialogOpen, setFoundDialogOpen] = useState(false);
  const [otherDomain, setOtherDomain] = useState("");
  const [attendanceData, setAttendanceData] = useState<{ percentage: number; attended: number; total: number } | null>(null);
  const [formData, setFormData] = useState<InternData>({
    name: "",
    contact: "",
    college: "",
    domain: "",
  });

  const deviceInfo = getDeviceInfo();

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const result = await api.checkIntern(deviceInfo.fingerprint);

        // Check for fee due notification
        if (result.feeDue) {
          setFeeDue(result.feeDue);
          setFeeDialogOpen(true);
        }

        if (result.found) {
          setIsReturning(true);
          // Load attendance data
          const attendResult = await api.getInternAttendancePercentage(deviceInfo.fingerprint);
          if (attendResult.success) {
            setAttendanceData({
              percentage: attendResult.percentage,
              attended: attendResult.attended,
              total: attendResult.total,
            });
          }

          // If the record indicates the user is already checked in today,
          // do not show the "previous registration" dialog (avoids redundant prompt).
          if (result.data.checkedIn) {
            setCheckedIn(true);
            // populate form only to display details (fields remain disabled while checked in)
            setFormData({
              name: result.data.name || "",
              contact: result.data.contact || "",
              college: result.data.college || "",
              domain: result.data.domain || "",
            });
            if (result.data.checkInTime) {
              const elapsed = Date.now() - new Date(result.data.checkInTime).getTime();
              const remaining = Math.max(0, 45 * 60 * 1000 - elapsed);
              if (remaining <= 0) {
                setCanCheckOut(true);
              } else {
                setTimer(Math.ceil(remaining / 1000));
              }
            }
          } else {
            // Do not auto-fill fields to avoid leaking previous user's details to another person
            // instead store the found data and prompt the user to load it explicitly.
            setFoundData({
              name: result.data.name || "",
              contact: result.data.contact || "",
              college: result.data.college || "",
              domain: result.data.domain || "",
            });
            setFoundDialogOpen(true);
          }
        }
      } catch {
        console.error("Error checking intern");
      } finally {
        setLoading(false);
      }
    };
    checkExisting();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // If domain is "Other", use the custom domain value
      const finalDomain = formData.domain === "Other" ? otherDomain : formData.domain;
      
      const payload = {
        ...formData,
        domain: finalDomain,
        fingerprint: deviceInfo.fingerprint,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
      };

      const result = isReturning && isEditing
        ? await api.updateIntern(payload)
        : await api.registerIntern(payload);

      if (result.success) {
        toast({ title: "Success", description: isReturning && isEditing ? "Details updated!" : "Registration complete!" });
        setIsReturning(true);
        // If this was an update (existing user editing), keep the form editable so user can continue refining immediately.
        if (!(isReturning && isEditing)) {
          setIsEditing(false);
        }
      } else {
        toast({ title: "Error", description: result.error || "Something went wrong", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      let result = await api.checkIn(deviceInfo.fingerprint);

      // If not registered today, attempt to auto-register using previous found data (if available)
      if (!result.success && result.error === "Please register first") {
        if (foundData) {
          const payload = {
            ...foundData,
            fingerprint: deviceInfo.fingerprint,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            deviceType: deviceInfo.deviceType,
          } as Record<string, string>;

          const reg = await api.registerIntern(payload);
          if (!reg.success) {
            toast({ title: "Error", description: reg.error || "Registration failed", variant: "destructive" });
            setSubmitting(false);
            return;
          }

          // update local state to reflect registration
          setIsReturning(true);
          setFormData(foundData);
          // Clear otherDomain since we're loading previous data
          if (foundData.domain !== "Other") {
            setOtherDomain("");
          }
          setIsEditing(false);

          // try check-in again after registration
          result = await api.checkIn(deviceInfo.fingerprint);
        } else {
          toast({ title: "Error", description: "Please register before checking in.", variant: "destructive" });
          setSubmitting(false);
          return;
        }
      }

      if (result.success) {
        setCheckedIn(true);
        // Lock editing for the rest of the day once checked in
        setIsEditing(false);
        setTimer(45 * 60);
        toast({ title: "Checked In!", description: "You have been checked in successfully." });

        // Re-check for fee due after check-in
        const checkResult = await api.checkIntern(deviceInfo.fingerprint);
        if (checkResult.feeDue) {
          setFeeDue(checkResult.feeDue);
          setFeeDialogOpen(true);
        }
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
      const result = await api.checkOut(deviceInfo.fingerprint);
      if (result.success) {
        setCheckedIn(false);
        setCanCheckOut(false);
        toast({ title: "Checked Out!", description: "See you next time!" });

        // Re-check for fee due after check-out
        const checkResult = await api.checkIntern(deviceInfo.fingerprint);
        if (checkResult.feeDue) {
          setFeeDue(checkResult.feeDue);
          setFeeDialogOpen(true);
        }
      } else {
        toast({ title: "Error", description: result.error || "Check-out failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgeFee = async () => {
    if (!feeDue) return;
    setAcknowledging(true);
    try {
      await api.acknowledgeFee(feeDue.id);
      setFeeDialogOpen(false);
      // Show persistent notification instead of clearing immediately
      setShowPersistentFeeNotification(true);
      toast({ title: "Acknowledged", description: "Please clear the fee due at the earliest." });
    } catch {
      toast({ title: "Error", description: "Failed to acknowledge. Please try again.", variant: "destructive" });
    } finally {
      setAcknowledging(false);
    }
  };

  const handleLoadFoundData = () => {
    if (!foundData) return;
    setFormData(foundData);
    // If the found data domain is "Other", we should prompt for it, so clear otherDomain
    if (foundData.domain === "Other") {
      setOtherDomain("");
    }
    setFoundData(null);
    setFoundDialogOpen(false);
    // enable editing so user can change if needed
    setIsEditing(true);
    // focus first input after enabling edit
    setTimeout(() => {
      const el = document.getElementById('name') as HTMLInputElement | null;
      el?.focus();
    }, 50);
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
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>

        <Card className="shadow-card animate-fade-in">
          <CardHeader>
            <div className="mb-3">
              <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-12 object-contain" />
            </div>
            <CardTitle className="font-display text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
              </div>
              {isReturning ? "Welcome Back!" : "Intern Registration"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(["name", "contact", "college"] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field} className="capitalize text-sm font-medium">
                    {field === "contact" ? "Contact Number" : field === "college" ? "College Name" : field}
                  </Label>
                  <Input
                    id={field}
                    value={formData[field]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))}
                    disabled={checkedIn || (isReturning && !isEditing)}
                    required
                    placeholder={`Enter your ${field}`}
                  />
                </div>
              ))}

              {/* Domain Dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="domain" className="text-sm font-medium">Domain</Label>
                <Select 
                  value={formData.domain} 
                  onValueChange={(value) => {
                    setFormData((prev) => ({ ...prev, domain: value }));
                    if (value !== "Other") {
                      setOtherDomain("");
                    }
                  }}
                  disabled={checkedIn || (isReturning && !isEditing)}
                >
                  <SelectTrigger id="domain">
                    <SelectValue placeholder="Select an internship domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERNSHIP_DOMAINS.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Other Domain Text Input */}
              {formData.domain === "Other" && (
                <div className="space-y-1.5">
                  <Label htmlFor="otherDomain" className="text-sm font-medium">Please specify your domain</Label>
                  <Input
                    id="otherDomain"
                    value={otherDomain}
                    onChange={(e) => setOtherDomain(e.target.value)}
                    disabled={checkedIn || (isReturning && !isEditing)}
                    required
                    placeholder="Enter your internship domain"
                  />
                </div>
              )}

              {isReturning && !isEditing && !checkedIn ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(true);
                    setTimeout(() => {
                      const el = document.getElementById('name') as HTMLInputElement | null;
                      el?.focus();
                    }, 50);
                  }}
                  className="w-full gap-2"
                >
                  <Pencil className="h-4 w-4" /> Edit Details
                </Button>
              ) : (
                <Button type="submit" className="w-full" disabled={submitting || checkedIn || (formData.domain === "Other" && !otherDomain)}>
                  {submitting ? "Saving..." : isReturning ? "Update Details" : "Register"}
                </Button>
              )}
            </form>

            {isReturning && (
              <div className="mt-6 border-t border-border pt-6 space-y-3">
                <h4 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Attendance Status
                </h4>
                {attendanceData && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Attendance</span>
                      <span className={`text-lg font-bold ${attendanceData.percentage === 100 ? "text-success" : attendanceData.percentage >= 75 ? "text-warning" : "text-destructive"}`}>
                        {attendanceData.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Verified Attendances: {attendanceData.attended} / {attendanceData.total}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          attendanceData.percentage === 100 ? "bg-success" : attendanceData.percentage >= 75 ? "bg-warning" : "bg-destructive"
                        }`}
                        style={{ width: `${attendanceData.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Persistent Fee Notification */}
                {showPersistentFeeNotification && feeDue && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 mb-4">
                    <button
                      onClick={() => setFeeDialogOpen(true)}
                      className="w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <div className="flex items-start gap-3">
                        <Bell className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-destructive">Fee Due Notification</p>
                          <p className="text-lg font-bold text-destructive mt-1">₹{feeDue.amount.toLocaleString("en-IN")}</p>
                          <p className="text-xs text-muted-foreground mt-1">{feeDue.message}</p>
                          <p className="text-xs text-destructive mt-2 underline">Click to view details</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                <h4 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Attendance
                </h4>
                {!checkedIn ? (
                  <Button
                    onClick={handleCheckIn}
                    className="w-full gap-2 gradient-primary text-primary-foreground hover:opacity-90"
                    disabled={submitting}
                  >
                    <LogIn className="h-4 w-4" /> Check In
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span className="font-medium text-success">You are checked in</span>
                    </div>
                    {!canCheckOut && timer > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm">
                        <Clock className="h-5 w-5 text-warning" />
                        <span className="text-warning font-medium">
                          Check-out available in {formatTime(timer)}
                        </span>
                      </div>
                    )}
                    <Button
                      onClick={handleCheckOut}
                      variant="outline"
                      className="w-full gap-2"
                      disabled={!canCheckOut || submitting}
                    >
                      <LogOut className="h-4 w-4" /> Check Out
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Prompt to load found previous details (do not auto-fill) */}
            {foundData && (
              <div className="mt-4 rounded-md border p-3 bg-muted/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-foreground">Previous registration found on this device.</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setFoundDialogOpen(true)}>View</Button>
                    <Button size="sm" onClick={handleLoadFoundData}>Load Previous Details</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fee Due Notification Dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl font-display">Fee Due Notice</DialogTitle>
            <DialogDescription className="text-center">
              Please read the following important notice regarding your pending fees.
            </DialogDescription>
          </DialogHeader>
          {feeDue && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                <p className="text-3xl font-bold text-destructive">₹{feeDue.amount.toLocaleString("en-IN")}</p>
                <p className="mt-1 text-sm text-muted-foreground">Outstanding Amount</p>
              </div>
              <p className="text-sm text-foreground leading-relaxed text-center">
                {feeDue.message}
              </p>
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={handleAcknowledgeFee}
              className="w-full sm:w-auto gap-2"
              disabled={acknowledging}
            >
              <CheckCircle2 className="h-4 w-4" />
              {acknowledging ? "Acknowledging..." : "I Acknowledge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Found previous details dialog - user must explicitly load to avoid leaking data */}
      <Dialog open={foundDialogOpen} onOpenChange={(open) => setFoundDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-display">Previous Registration Found</DialogTitle>
            <DialogDescription className="text-center">
              A previous registration was detected on this device. You can preview and choose to load these details into the form.
            </DialogDescription>
          </DialogHeader>
          {foundData && (
            <div className="space-y-3 py-2">
              <div className="text-sm">
                <div><strong>Name:</strong> {foundData.name}</div>
                <div><strong>Contact:</strong> {foundData.contact}</div>
                <div><strong>College:</strong> {foundData.college}</div>
                <div><strong>Domain:</strong> {foundData.domain}</div>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => {
                setFoundDialogOpen(false);
                // Allow the user to enter details manually
                setIsEditing(true);
                setTimeout(() => {
                  const el = document.getElementById('name') as HTMLInputElement | null;
                  el?.focus();
                }, 50);
              }}
            >
              Continue Without Loading
            </Button>
            <Button onClick={handleLoadFoundData} className="ml-2">Load Previous Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InternForm;
