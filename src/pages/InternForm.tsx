import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, LogIn, LogOut, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { api } from "@/lib/api";

type InternData = {
  name: string;
  contact: string;
  college: string;
  domain: string;
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
        if (result.found) {
          setIsReturning(true);
          setFormData({
            name: result.data.name || "",
            contact: result.data.contact || "",
            college: result.data.college || "",
            domain: result.data.domain || "",
          });
          if (result.data.checkedIn) {
            setCheckedIn(true);
            if (result.data.checkInTime) {
              const elapsed = Date.now() - new Date(result.data.checkInTime).getTime();
              const remaining = Math.max(0, 30 * 60 * 1000 - elapsed);
              if (remaining <= 0) {
                setCanCheckOut(true);
              } else {
                setTimer(Math.ceil(remaining / 1000));
              }
            }
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
      const payload = {
        ...formData,
        fingerprint: deviceInfo.fingerprint,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
      };

      const result = isReturning && isEditing
        ? await api.updateIntern(payload)
        : await api.registerIntern(payload);

      if (result.success) {
        toast({ title: "Success", description: isReturning ? "Details updated!" : "Registration complete!" });
        setIsReturning(true);
        setIsEditing(false);
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
      const result = await api.checkIn(deviceInfo.fingerprint);
      if (result.success) {
        setCheckedIn(true);
        setTimer(30 * 60);
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
      const result = await api.checkOut(deviceInfo.fingerprint);
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
            <CardTitle className="font-display text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
              </div>
              {isReturning ? "Welcome Back!" : "Intern Registration"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(["name", "contact", "college", "domain"] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <Label htmlFor={field} className="capitalize text-sm font-medium">
                    {field === "contact" ? "Contact Number" : field === "college" ? "College Name" : field}
                  </Label>
                  <Input
                    id={field}
                    value={formData[field]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }))}
                    disabled={isReturning && !isEditing}
                    required
                    placeholder={`Enter your ${field}`}
                  />
                </div>
              ))}

              {isReturning && !isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="w-full gap-2"
                >
                  <Pencil className="h-4 w-4" /> Edit Details
                </Button>
              ) : (
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "Saving..." : isReturning ? "Update Details" : "Register"}
                </Button>
              )}
            </form>

            {isReturning && (
              <div className="mt-6 border-t border-border pt-6 space-y-3">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InternForm;
