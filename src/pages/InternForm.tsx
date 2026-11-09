import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, LogIn, LogOut, CheckCircle2, Clock, AlertTriangle, Bell, Download, FileText } from "lucide-react";
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



type InternData = {
  name: string;
  contact: string;
  college: string;
  domain: string;
  internshipStartDate: string;
  internshipEndDate: string;
  internshipDuration: string;
};

type FeeDue = {
  id: string;
  amount: number;
  message: string;
};

type ManagedDocument = {
  domainSlug: string;
  type: "report" | "logsheet";
  duration?: number | null;
  url: string;
  name: string;
};

const reportFiles: Record<string, string> = {
  "data-science-with-python": "Data Science with Python REPORT.docx",
  "cyber-security": "Cyber Security Internship Report.docx",
  "machine-learning-with-python": "Machine Learning with Python REPORT.docx",
  iot: "IOT REPORT.docx",
  "financial-modelling": "FINANCE REPORT EDUPHOENIX SOLUTIONS.docx",
  "digital-marketing": "Digital Marketing Report EduPhoenix solutions.docx",
  "full-stack-development": "Full Stack Development REPORT.docx",
  "human-resources": "HR report EduPhoenix Solutions.docx",
  "cloud-computing": "Cloud_Computing_Internship_Report.docx",
};

const logsheetFiles: Record<string, Partial<Record<number, string>>> = {
  "full-stack-development": {
    1: "FULL STACK DEVELOPMENT 1 MONTH INTERN LOG SHEET.pdf",
    3: "FULL STACK DEVELOPMENT 3 MONTHS INTERN LOG SHEET.pdf",
  },
  "data-science-with-python": {
    1: "DATA SCIENCE WITH PYTHON LOG SHEET_ 30 DAYS.pdf",
    2: "Data_Science_With_Python_60_Days_Log_Sheet.pdf",
  },
  "cyber-security": {
    1: "CYBER SECURITY 1 MONTH INTERN LOG SHEET.pdf",
    2: "CYBER SECURITY 2M INTERN LOG SHEET.pdf",
    3: "CYBER SECURITY 3 MONTHS INTERN LOG SHEET.pdf",
  },
  "machine-learning-with-python": {
    1: "MACHINE LEARNING WITH PYTHON Log Sheet.pdf",
    2: "MACHINE_LEARNING_WITH_PYTHON_60_Days_Log_Sheet.pdf",
  },
  iot: {
    1: "daily log_sheet_IOT 30 days.pdf",
    3: "90 Days IoT log sheet.pdf",
  },
  "digital-marketing": {
    1: "Digital_Marketing_30_Day_Log_Sheet_1_Month.pdf",
    3: "Digital_Marketing_90_Day_Log_Sheet_3_Months.pdf",
  },
  "financial-modelling": {
    3: "Finance_Internship_3_Months_Log_Sheet-1.pdf",
  },
  "human-resources": {
    1: "HR_30days_1page_logsheet.pdf",
  },
  "cloud-computing": {
    1: "CLOUD COMPUTING 1M Log Sheet.pdf",
    2: "CLOUD COMPUTING 2M Log Sheet.pdf",
    3: "CLOUD COMPUTING 3M Log Sheet.pdf",
  },
};

const domainSlug = (domain: string) => domain.toLowerCase()
  .replace(/\s*\(hr\)/g, "")
  .replace(/ internship$/, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const getInternshipDuration = (startDate: string, endDate: string): 1 | 2 | 3 | 6 => {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const durationInDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const durationInMonths = durationInDays / 30;
  if (durationInMonths <= 1.5) return 1;
  if (durationInMonths <= 2.5) return 2;
  if (durationInMonths <= 4.5) return 3;
  return 6;
};

const getEndDateForDuration = (startDate: string, duration: string) => {
  if (!startDate || !duration) return "";
  const endDate = new Date(`${startDate}T00:00:00`);
  endDate.setMonth(endDate.getMonth() + Number(duration));
  endDate.setDate(endDate.getDate() - 1);
  return endDate.toISOString().split("T")[0];
};

const getDownloadKey = (fingerprint: string, domain: string, startDate: string, endDate: string, type: "report" | "logsheet") =>
  `intern-document-downloads:${fingerprint}:${domain}:${startDate}:${endDate}:${type}`;

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

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
    internshipStartDate: "",
    internshipEndDate: "",
    internshipDuration: "",
  });
  const [internshipDomains, setInternshipDomains] = useState<string[]>([]);
  const [managedDocuments, setManagedDocuments] = useState<ManagedDocument[]>([]);

  const deviceInfo = getDeviceInfo();
  const internshipDatesLocked = isReturning && Boolean(formData.internshipStartDate && formData.internshipEndDate);
  const selectedDomainSlug = domainSlug(formData.domain);
  const selectedDuration = formData.internshipStartDate && formData.internshipEndDate
    ? Number(formData.internshipDuration) || getInternshipDuration(formData.internshipStartDate, formData.internshipEndDate)
    : null;
  const reportFile = reportFiles[selectedDomainSlug];
  const logsheetFile = selectedDuration ? logsheetFiles[selectedDomainSlug]?.[selectedDuration] : undefined;
  const managedReport = managedDocuments.find((resource) => resource.domainSlug === selectedDomainSlug && resource.type === "report");
  const managedLogsheet = managedDocuments.find((resource) => resource.domainSlug === selectedDomainSlug && resource.type === "logsheet" && resource.duration === selectedDuration);
  const reportAvailable = managedReport?.url || reportFile;
  const logsheetAvailable = managedLogsheet?.url || logsheetFile;
  const completionReached = Boolean(formData.internshipEndDate && new Date().toISOString().slice(0, 10) >= formData.internshipEndDate);
  const [downloadRefresh, setDownloadRefresh] = useState(0);
  void downloadRefresh;
  const getDownloadCount = (type: "report" | "logsheet") => Number(localStorage.getItem(getDownloadKey(deviceInfo.fingerprint, selectedDomainSlug, formData.internshipStartDate, formData.internshipEndDate, type)) || "0");
  const downloadAsset = (file: string, duration?: number) => {
    const path = duration
      ? `/logsheets/${selectedDomainSlug}/${duration}-month/${file}`
      : `/reports/${selectedDomainSlug}/${file}`;
    const link = document.createElement("a");
    link.href = path.split("/").map((part, index) => index === 0 ? part : encodeURIComponent(part)).join("/");
    link.download = file;
    link.click();
  };
  const downloadStudentAsset = (type: "report" | "logsheet") => {
    const file = type === "report" ? reportFile : logsheetFile;
    const managedUrl = type === "report" ? managedReport?.url : managedLogsheet?.url;
    if ((!file && !managedUrl) || !completionReached || getDownloadCount(type) >= 2) return;
    const key = getDownloadKey(deviceInfo.fingerprint, selectedDomainSlug, formData.internshipStartDate, formData.internshipEndDate, type);
    localStorage.setItem(key, String(getDownloadCount(type) + 1));
    if (managedUrl) {
      const link = document.createElement("a");
      link.href = managedUrl;
      link.download = type === "report" ? managedReport?.name || "report" : managedLogsheet?.name || "logsheet";
      link.click();
    } else if (file) {
      downloadAsset(file, type === "logsheet" ? selectedDuration || undefined : undefined);
    }
    setDownloadRefresh((count) => count + 1);
  };

  useEffect(() => {
    const checkExisting = async () => {
      try {
        // Run network requests in parallel to drastically improve load times
        const [domainsResult, result, attendResult, resourcesResult] = await Promise.all([
          api.getCourses(),
          api.checkIntern(deviceInfo.fingerprint),
          api.getInternAttendancePercentage(deviceInfo.fingerprint),
          api.getDocumentResources()
        ]);

        if (resourcesResult.success) setManagedDocuments(resourcesResult.resources as ManagedDocument[]);

        if (domainsResult.success && domainsResult.courses) {
          setInternshipDomains(domainsResult.courses.filter(c => c.enabled).map(c => c.name));
        } else {
          setInternshipDomains(["Other"]);
        }

        // Check for fee due notification
        if (result.feeDue) {
          setFeeDue(result.feeDue);
          setFeeDialogOpen(true);
        }

        if (result.found) {
          setIsReturning(true);
          // Set attendance data that was fetched in parallel
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
              internshipStartDate: result.data.internshipStartDate || "",
              internshipEndDate: result.data.internshipEndDate || "",
              internshipDuration: result.data.internshipDuration || (result.data.internshipStartDate && result.data.internshipEndDate ? String(getInternshipDuration(result.data.internshipStartDate, result.data.internshipEndDate)) : ""),
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
              internshipStartDate: result.data.internshipStartDate || "",
              internshipEndDate: result.data.internshipEndDate || "",
              internshipDuration: result.data.internshipDuration || (result.data.internshipStartDate && result.data.internshipEndDate ? String(getInternshipDuration(result.data.internshipStartDate, result.data.internshipEndDate)) : ""),
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
    if (formData.internshipEndDate < formData.internshipStartDate) {
      toast({ title: "Invalid dates", description: "The internship end date must be on or after the start date.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // If domain includes "other", use the custom domain value
      const finalDomain = formData.domain && formData.domain.toLowerCase().includes("other") ? otherDomain : formData.domain;
      
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
          if (foundData.domain && !foundData.domain.toLowerCase().includes("other")) {
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
    if (foundData.domain && foundData.domain.toLowerCase().includes("other")) {
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
    <div className="dashboard-shell flex min-h-screen flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="dashboard-mesh pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-32 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-[100px] animate-pulse" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-accent/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="p-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="font-medium">Back to Home</span>
        </button>

        <Card className="dashboard-panel animate-fade-in p-2 sm:p-4">
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
                    className="bg-background/50 backdrop-blur-sm focus:bg-background transition-colors"
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
                    {internshipDomains.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Other Domain Text Input */}
              {formData.domain && formData.domain.toLowerCase().includes("other") && (
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="internshipStartDate" className="text-sm font-medium">Internship Start Date</Label>
                  <Input
                    id="internshipStartDate"
                    type="date"
                    value={formData.internshipStartDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, internshipStartDate: e.target.value, internshipEndDate: getEndDateForDuration(e.target.value, prev.internshipDuration) }))}
                    disabled={checkedIn || internshipDatesLocked}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="internshipDuration" className="text-sm font-medium">Internship Duration</Label>
                  <Select
                    value={formData.internshipDuration}
                    onValueChange={(value) => setFormData((prev) => ({
                      ...prev,
                      internshipDuration: value,
                      internshipEndDate: getEndDateForDuration(prev.internshipStartDate, value),
                    }))}
                    disabled={checkedIn || internshipDatesLocked}
                  >
                    <SelectTrigger id="internshipDuration">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, index) => String(index + 1)).map((duration) => (
                        <SelectItem key={duration} value={duration}>{duration} {duration === "1" ? "Month" : "Months"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="internshipEndDate" className="text-sm font-medium">Internship End Date</Label>
                  <Input
                    id="internshipEndDate"
                    type="date"
                    value={formData.internshipEndDate}
                    min={formData.internshipStartDate || undefined}
                    onChange={(e) => setFormData((prev) => ({ ...prev, internshipEndDate: e.target.value }))}
                    disabled={checkedIn || internshipDatesLocked || Boolean(formData.internshipDuration)}
                    required
                  />
                </div>
              </div>

              {isReturning && formData.internshipStartDate && formData.internshipEndDate && (
                <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                  <div>
                    <h3 className="font-semibold">Internship Documents</h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(formData.internshipStartDate)} to {formatDate(formData.internshipEndDate)} · {selectedDuration}-month logsheet
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-11 w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left"
                      disabled={!reportAvailable || !completionReached || getDownloadCount("report") >= 2}
                      onClick={() => downloadStudentAsset("report")}
                      title={!completionReached ? "Available after internship completion" : getDownloadCount("report") >= 2 ? "Download limit reached" : reportAvailable ? "Download internship report" : "Report is not available for this domain"}
                    >
                      <FileText className="h-4 w-4" />
                      {!completionReached ? "Report available after internship completion" : getDownloadCount("report") >= 2 ? "Report download limit reached" : reportAvailable ? `Download Report (${2 - getDownloadCount("report")} left)` : "Report unavailable"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-11 w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left"
                      disabled={!logsheetAvailable || !completionReached || getDownloadCount("logsheet") >= 2}
                      onClick={() => downloadStudentAsset("logsheet")}
                      title={!completionReached ? "Available after internship completion" : getDownloadCount("logsheet") >= 2 ? "Download limit reached" : logsheetAvailable ? `Download ${selectedDuration}-month logsheet` : "Logsheet is not available for this duration"}
                    >
                      <Download className="h-4 w-4" />
                      {!completionReached ? "Logsheet available after internship completion" : getDownloadCount("logsheet") >= 2 ? "Logsheet download limit reached" : logsheetAvailable ? `Download ${selectedDuration}-Month Logsheet (${2 - getDownloadCount("logsheet")} left)` : `${selectedDuration}-Month logsheet unavailable`}
                    </Button>
                  </div>
                  {selectedDomainSlug === "cyber-security" && (
                    <p className="text-xs text-muted-foreground">
                      Cyber Security testing is enabled for any dates you enter; the closest supported logsheet duration is selected automatically.
                    </p>
                  )}
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
                  className="w-full gap-2 h-12 rounded-xl border-primary/20 hover:bg-primary/5"
                >
                  <Pencil className="h-4 w-4" /> Edit Details
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]" 
                  disabled={submitting || checkedIn || (formData.domain && formData.domain.toLowerCase().includes("other") && !otherDomain)}
                >
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
