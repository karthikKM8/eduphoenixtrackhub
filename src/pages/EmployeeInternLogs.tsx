import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2, Check, X, Trash2, User, Calendar, ChevronLeft, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface InternLog {
  id: string;
  name: string;
  contact: string;
  college: string;
  domain: string;
  fingerprint: string;
  checkInTime: string;
  checkOutTime: string;
  date: string;
  attendanceVerified?: boolean;
  verifiedBy?: string;
}

type CollegeStudent = {
  name: string;
  fingerprint: string;
  contact: string;
  domain: string;
  college: string;
  totalDays: number;
  latestLog: InternLog;
};

const EmployeeInternLogs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logs, setLogs] = useState<InternLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InternLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<InternLog | null>(null);
  const [studentDetail, setStudentDetail] = useState<InternLog | null>(null);
  const [studentHistory, setStudentHistory] = useState<InternLog[]>([]);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);
  const [historyVerifyingId, setHistoryVerifyingId] = useState<string | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<InternLog | null>(null);
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const [collegeStudents, setCollegeStudents] = useState<CollegeStudent[]>([]);
  const [attendancePercentages, setAttendancePercentages] = useState<Record<string, { percentage: number; attended: number; total: number }>>({});
  const [jobRoles, setJobRoles] = useState<string[]>([]);

  const employeeToken = localStorage.getItem("employee_token");
  const employeeName = localStorage.getItem("employee_name") || "Employee";
  const verifiedRecords = filteredLogs.filter((log) => log.attendanceVerified).length;
  const activeToday = filteredLogs.filter((log) => log.checkInTime && !log.checkOutTime).length;

  useEffect(() => {
    if (!employeeToken) {
      navigate("/employee");
      return;
    }
    // Load initial job roles from storage
    const storedRoles = JSON.parse(localStorage.getItem("employee_jobRoles") || "[]");
    setJobRoles(storedRoles);
    
    // Fetch fresh job roles from database and load logs
    const loadInitialData = async () => {
      const employeeEmail = localStorage.getItem("employee_email") || "";
      const rolesResult = await api.getEmployeeJobRoles(employeeEmail);
      const rolesToUse = (rolesResult.success && rolesResult.jobRoles) ? rolesResult.jobRoles : storedRoles;
      
      if (rolesToUse.length > 0) {
        setJobRoles(rolesToUse);
        // Update localStorage with fresh data
        localStorage.setItem("employee_jobRoles", JSON.stringify(rolesToUse));
        loadLogs(rolesToUse);
      } else {
        loadLogs(storedRoles);
      }
    };
    
    loadInitialData();
  }, [employeeToken]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterDate]);

  const loadLogs = async (roles: string[], isRefresh: boolean = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const result = await api.getEmployeeInternLogs(roles);
      if (result.success) {
        const logsData = result.logs || [];
        setLogs(logsData);

        // Load attendance percentages in the background without blocking
        if (logsData.length > 0) {
          const fingerprints = [...new Set(logsData.map((log: { fingerprint: string }) => log.fingerprint).filter(Boolean))] as string[];
          
          if (fingerprints.length > 0) {
            // Fire and forget - don't await, let it load in background
            api.getInternAttendancePercentageBatch(fingerprints).then((batchResult) => {
              if (batchResult.success) {
                setAttendancePercentages(batchResult.data || {});
              }
            }).catch(() => {
              // Silently fail for background operations
            });
          }
        }
      } else {
        toast({ title: "Error", description: "Failed to load logs", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.name.toLowerCase().includes(search) ||
          log.contact.toLowerCase().includes(search) ||
          log.college.toLowerCase().includes(search)
      );
    }

    if (filterDate) {
      filtered = filtered.filter((log) => log.date === filterDate);
    }

    setFilteredLogs(filtered);
  };

  const handleVerifyAttendance = async (log: InternLog, verify: boolean) => {
    setVerifyingId(log.id);
    try {
      const result = await api.verifyInternAttendance(log.fingerprint, verify, log.date);
      if (result.success) {
        // Update only the specific log entry by ID
        setLogs((prevLogs) =>
          prevLogs.map((l) =>
            l.id === log.id
              ? { ...l, attendanceVerified: verify, verifiedBy: verify ? "Verified" : "" }
              : l
          )
        );

        // Reload attendance percentage
        const percResult = await api.getInternAttendancePercentage(log.fingerprint);
        if (percResult.success) {
          setAttendancePercentages((prev) => ({
            ...prev,
            [log.fingerprint]: {
              percentage: percResult.percentage,
              attended: percResult.attended,
              total: percResult.total,
            },
          }));
        }

        toast({
          title: "Success",
          description: verify ? `Attendance verified for ${log.name}` : `Attendance verification removed for ${log.name}`,
        });
      } else {
        toast({ title: "Error", description: result.error || "Failed to update attendance", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteEntry = async (log: InternLog) => {
    setDeletingId(log.id);
    try {
      // Always permanently delete from database
      const result = await api.deleteInternLog(log.id);
      if (result.success) {
        setLogs((prev) => prev.filter((l) => l.id !== log.id));
        toast({
          title: "Deleted",
          description: `Entry for ${log.name} on ${log.date} has been permanently removed from the system.`,
        });
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete entry", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  const handleStudentClick = async (log: InternLog) => {
    setStudentDetail(log);
    setStudentHistoryLoading(true);
    try {
      const result = await api.getInternLogsByFingerprint(log.fingerprint);
      if (result.success) {
        setStudentHistory(result.logs as InternLog[]);
      } else {
        setStudentHistory([]);
      }
    } catch {
      setStudentHistory([]);
    } finally {
      setStudentHistoryLoading(false);
    }
  };

  const handleHistoryVerify = async (entry: InternLog, verify: boolean) => {
    setHistoryVerifyingId(entry.id);
    try {
      const result = await api.verifyInternAttendance(entry.fingerprint, verify, entry.date);
      if (result.success) {
        // Update history dialog state
        setStudentHistory((prev) =>
          prev.map((l) => l.id === entry.id ? { ...l, attendanceVerified: verify, verifiedBy: verify ? "Verified" : "" } : l)
        );
        // Update the selected detail entry if viewing it
        setSelectedHistoryEntry((prev) =>
          prev && prev.id === entry.id ? { ...prev, attendanceVerified: verify, verifiedBy: verify ? "Verified" : "" } : prev
        );
        // Update main logs table if the same entry is visible
        setLogs((prev) =>
          prev.map((l) => l.id === entry.id ? { ...l, attendanceVerified: verify, verifiedBy: verify ? "Verified" : "" } : l)
        );
        // Refresh attendance percentage
        const percResult = await api.getInternAttendancePercentage(entry.fingerprint);
        if (percResult.success) {
          setAttendancePercentages((prev) => ({
            ...prev,
            [entry.fingerprint]: { percentage: percResult.percentage, attended: percResult.attended, total: percResult.total },
          }));
        }
        toast({ title: "Success", description: verify ? `Verified attendance for ${entry.date}` : `Removed verification for ${entry.date}` });
      } else {
        toast({ title: "Error", description: result.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setHistoryVerifyingId(null);
    }
  };

  const normalizeCollege = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const buildCollegeKey = (name: string) => {
    const tokens = normalizeCollege(name)
      .split(" ")
      .filter(Boolean)
      .sort();
    return tokens.join(" ");
  };

  const handleCollegeClick = (collegeName: string) => {
    const selectedCollegeKey = buildCollegeKey(collegeName);
    // Match by normalized word tokens so the same college is grouped even with
    // different casing, spacing, punctuation, or word formatting.
    const matchingLogs = logs.filter((l) => buildCollegeKey(l.college) === selectedCollegeKey);
    // Group by fingerprint to get unique students
    const studentMap = new Map<string, CollegeStudent>();
    matchingLogs.forEach((log) => {
      const existing = studentMap.get(log.fingerprint);
      if (!existing) {
        studentMap.set(log.fingerprint, {
          name: log.name,
          fingerprint: log.fingerprint,
          contact: log.contact,
          domain: log.domain,
          college: log.college,
          totalDays: 1,
          latestLog: log,
        });
      } else {
        existing.totalDays += 1;
        if (log.date > existing.latestLog.date) {
          existing.latestLog = log;
          existing.name = log.name;
          existing.contact = log.contact;
        }
      }
    });
    setCollegeStudents(Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedCollege(collegeName);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Set a 3-second timeout for the refresh operation
      await Promise.race([
        loadLogs(jobRoles, true),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
      ]);
      
      toast({ title: "Refreshed", description: "Data has been refreshed" });
    } catch (error) {
      if (error instanceof Error && error.message === "Timeout") {
        toast({ title: "Refreshed", description: "Data displayed (attendance % loading in background)" });
      } else {
        toast({ title: "Error", description: "Failed to refresh data", variant: "destructive" });
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (!employeeToken) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="dashboard-shell min-h-screen px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <button
          onClick={() => navigate("/employee/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="dashboard-panel overflow-hidden rounded-[28px] p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="status-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Instructor Verification Hub
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">Student Attendance Logs</h1>
              <p className="mt-2 text-base text-muted-foreground">
              Manage and verify attendance for students in your domain - {employeeName}
              </p>
              {jobRoles.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {jobRoles.map((role) => (
                    <span key={role} className="status-chip inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-foreground">
                    {role}
                  </span>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleRefresh} variant="outline" className="gap-2 rounded-full bg-white/70" disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Visible Records</p>
              <p className="mt-2 font-display text-3xl font-bold">{filteredLogs.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Verified</p>
              <p className="mt-2 font-display text-3xl font-bold text-success">{verifiedRecords}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active Today</p>
              <p className="mt-2 font-display text-3xl font-bold">{activeToday}</p>
            </div>
          </div>
        </div>

        {jobRoles.length === 0 && (
          <Card className="mb-6 border-warning bg-warning/5 shadow-card">
            <CardContent className="pt-6">
              <p className="text-warning font-medium">⚠️ No job roles assigned</p>
              <p className="text-sm text-muted-foreground mt-1">Contact your administrator to assign training domains.</p>
            </CardContent>
          </Card>
        )}

        <Card className="dashboard-panel mb-6 rounded-[24px] border-0 shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-xl">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="search">Search (Name, Contact, College)</Label>
                <Input
                  id="search"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-filter">Filter by Date</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-panel rounded-[24px] border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-xl">Records ({filteredLogs.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-2xl border border-border/60 bg-white/65">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Name</th>
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Contact</th>
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">College</th>
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Domain</th>
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Check-in</th>
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Check-out</th>
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Attendance %</th>
                    <th className="px-4 py-3 text-center font-bold bg-muted/50">Verify</th>
                    <th className="px-4 py-3 text-center font-bold bg-muted/50">Actions</th>
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                        No student records found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/70 hover:bg-white/75 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleStudentClick(log)}
                            className="text-primary hover:underline cursor-pointer font-semibold text-left"
                          >
                            {log.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium">{log.contact}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleCollegeClick(log.college)}
                            className="text-primary hover:underline cursor-pointer text-left"
                          >
                            {log.college}
                          </button>
                        </td>
                        <td className="px-4 py-3">{log.domain}</td>
                        <td className="px-4 py-3 font-medium">
                          {log.checkInTime ? new Date(log.checkInTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {log.checkOutTime ? new Date(log.checkOutTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          <span className={attendancePercentages[log.fingerprint]?.percentage === 100 ? "text-success" : "text-warning"}>
                            {attendancePercentages[log.fingerprint]?.percentage || 0}% ({attendancePercentages[log.fingerprint]?.attended || 0}/{attendancePercentages[log.fingerprint]?.total || 0})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {!log.checkInTime ? (
                              <span className="text-xs text-muted-foreground">Not checked in</span>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant={log.attendanceVerified ? "default" : "outline"}
                                  onClick={() => handleVerifyAttendance(log, !log.attendanceVerified)}
                                  disabled={verifyingId === log.id}
                                  className="h-8 w-8 p-0"
                                  title={log.attendanceVerified ? "Mark as unverified" : "Mark as attended"}
                                >
                                  {verifyingId === log.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : log.attendanceVerified ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirm(log)}
                              disabled={deletingId === log.id}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              title="Delete this entry"
                            >
                              {deletingId === log.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">{log.date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student Entry</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete the entry for <strong>{deleteConfirm?.name}</strong> on <strong>{deleteConfirm?.date}</strong>. Select the reason for deletion:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteEntry(deleteConfirm)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Delete - Allow Re-entry
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteEntry(deleteConfirm)}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete - Block Re-entry for Day
            </AlertDialogAction>
            <AlertDialogCancel className="w-full mt-0">Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* College Students Dialog */}
      <Dialog open={!!selectedCollege} onOpenChange={(open) => { if (!open) { setSelectedCollege(null); setCollegeStudents([]); } }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedCollege} — Students ({collegeStudents.length})
            </DialogTitle>
          </DialogHeader>
          {collegeStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No students found</p>
          ) : (
            <div className="space-y-2">
              {collegeStudents.map((student) => (
                <button
                  key={student.fingerprint}
                  onClick={() => {
                    setSelectedCollege(null);
                    setCollegeStudents([]);
                    handleStudentClick(student.latestLog);
                  }}
                  className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm text-primary">{student.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{student.domain} &middot; {student.contact}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{student.totalDays} day{student.totalDays !== 1 ? 's' : ''}</p>
                      <p className={`text-xs font-bold ${(attendancePercentages[student.fingerprint]?.percentage || 0) >= 75 ? 'text-success' : 'text-destructive'}`}>
                        {attendancePercentages[student.fingerprint]?.percentage || 0}%
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Detail Dialog */}
      <Dialog open={!!studentDetail} onOpenChange={(open) => { if (!open) { setStudentDetail(null); setStudentHistory([]); setSelectedHistoryEntry(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedHistoryEntry && studentDetail ? (
            /* ── Date Detail Sub-view ── */
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedHistoryEntry(null)}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-1"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <Calendar className="h-5 w-5" />
                  {studentDetail.name} — {selectedHistoryEntry.date}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Student</p>
                    <p className="font-semibold">{studentDetail.name}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Domain</p>
                    <p className="font-semibold">{studentDetail.domain}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Check-in Time</p>
                    <p className="font-semibold">
                      {selectedHistoryEntry.checkInTime
                        ? new Date(selectedHistoryEntry.checkInTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
                        : 'Not checked in'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Check-out Time</p>
                    <p className="font-semibold">
                      {selectedHistoryEntry.checkOutTime
                        ? new Date(selectedHistoryEntry.checkOutTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
                        : 'Not checked out'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">College</p>
                    <p className="font-semibold">{studentDetail.college}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Contact</p>
                    <p className="font-semibold">{studentDetail.contact}</p>
                  </div>
                </div>

                <div className={`rounded-lg border p-4 ${selectedHistoryEntry.attendanceVerified ? 'bg-success/10 border-success/30' : 'bg-muted/50 border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedHistoryEntry.attendanceVerified
                        ? <Check className="h-5 w-5 text-success" />
                        : <X className="h-5 w-5 text-muted-foreground" />}
                      <span className="font-semibold text-sm">
                        {selectedHistoryEntry.attendanceVerified ? 'Attendance Verified' : 'Attendance Not Verified'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedHistoryEntry.verifiedBy ? `by ${selectedHistoryEntry.verifiedBy}` : ''}
                    </span>
                  </div>
                </div>

                {!selectedHistoryEntry.checkInTime ? (
                  <p className="text-sm text-muted-foreground text-center">Cannot verify — student did not check in on this date.</p>
                ) : (
                  <div className="flex gap-3">
                    {selectedHistoryEntry.attendanceVerified ? (
                      <Button
                        variant="outline"
                        className="flex-1 gap-2 border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          handleHistoryVerify(selectedHistoryEntry, false);
                        }}
                        disabled={historyVerifyingId === selectedHistoryEntry.id}
                      >
                        {historyVerifyingId === selectedHistoryEntry.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <X className="h-4 w-4" />}
                        Remove Verification
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => {
                          handleHistoryVerify(selectedHistoryEntry, true);
                        }}
                        disabled={historyVerifyingId === selectedHistoryEntry.id}
                      >
                        {historyVerifyingId === selectedHistoryEntry.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Check className="h-4 w-4" />}
                        Verify Attendance
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Main History List View ── */
            <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {studentDetail?.name} — Attendance History
            </DialogTitle>
          </DialogHeader>
          {studentDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Contact:</span> <span className="font-medium">{studentDetail.contact}</span></div>
                <div><span className="text-muted-foreground">College:</span> <span className="font-medium">{studentDetail.college}</span></div>
                <div><span className="text-muted-foreground">Domain:</span> <span className="font-medium">{studentDetail.domain}</span></div>
                <div>
                  <span className="text-muted-foreground">Overall: </span>
                  <span className={`font-bold ${(attendancePercentages[studentDetail.fingerprint]?.percentage || 0) >= 75 ? "text-success" : "text-destructive"}`}>
                    {attendancePercentages[studentDetail.fingerprint]?.percentage || 0}% ({attendancePercentages[studentDetail.fingerprint]?.attended || 0}/{attendancePercentages[studentDetail.fingerprint]?.total || 0})
                  </span>
                </div>
              </div>
              <div className="border-t pt-3">
                <h4 className="font-semibold text-sm mb-3">All Attendance Records</h4>
                {studentHistoryLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : studentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No records found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-3 py-2 text-left font-bold bg-muted/50">Date</th>
                          <th className="px-3 py-2 text-left font-bold bg-muted/50">Check-in</th>
                          <th className="px-3 py-2 text-left font-bold bg-muted/50">Check-out</th>
                          <th className="px-3 py-2 text-center font-bold bg-muted/50">Verified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentHistory.map((entry) => (
                          <tr key={entry.id} className="border-b border-border hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedHistoryEntry(entry)}>
                            <td className="px-3 py-2 font-medium text-primary hover:underline">{entry.date}</td>
                            <td className="px-3 py-2">
                              {entry.checkInTime
                                ? new Date(entry.checkInTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              {entry.checkOutTime
                                ? new Date(entry.checkOutTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {!entry.checkInTime ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <Button
                                  size="sm"
                                  variant={entry.attendanceVerified ? "default" : "outline"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleHistoryVerify(entry, !entry.attendanceVerified);
                                  }}
                                  disabled={historyVerifyingId === entry.id}
                                  className="h-7 w-7 p-0"
                                  title={entry.attendanceVerified ? "Remove verification" : "Verify attendance"}
                                >
                                  {historyVerifyingId === entry.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : entry.attendanceVerified ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <X className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeInternLogs;
