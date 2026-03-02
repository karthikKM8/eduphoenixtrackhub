import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [attendancePercentages, setAttendancePercentages] = useState<Record<string, { percentage: number; attended: number; total: number }>>({});
  const [jobRoles, setJobRoles] = useState<string[]>([]);

  const employeeToken = localStorage.getItem("employee_token");
  const employeeName = localStorage.getItem("employee_name") || "Employee";

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

  const loadLogs = async (roles: string[]) => {
    setLoading(true);
    try {
      const result = await api.getEmployeeInternLogs(roles);
      if (result.success) {
        const logsData = result.logs || [];
        setLogs(logsData);

        // Optimized: Batch load attendance percentages instead of one-by-one
        if (logsData.length > 0) {
          const fingerprints = [...new Set(logsData.map((log: { fingerprint: string }) => log.fingerprint).filter(Boolean))] as string[];
          
          if (fingerprints.length > 0) {
            const batchResult = await api.getInternAttendancePercentageBatch(fingerprints);
            if (batchResult.success) {
              setAttendancePercentages(batchResult.data || {});
            }
          }
        }
      } else {
        toast({ title: "Error", description: "Failed to load logs", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
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
    setVerifyingId(log.fingerprint);
    try {
      const result = await api.verifyInternAttendance(log.fingerprint, verify);
      if (result.success) {
        // Update local state
        setLogs((prevLogs) =>
          prevLogs.map((l) =>
            l.fingerprint === log.fingerprint
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs(jobRoles);
    setRefreshing(false);
    toast({ title: "Refreshed", description: "Data has been refreshed" });
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
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => navigate("..")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Attendance Logs</h1>
            <p className="text-base text-muted-foreground mt-1">
              Manage and verify attendance for students in your domain - {employeeName}
            </p>
            {jobRoles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {jobRoles.map((role) => (
                  <span key={role} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {jobRoles.length === 0 && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="pt-6">
              <p className="text-warning font-medium">⚠️ No job roles assigned</p>
              <p className="text-sm text-muted-foreground mt-1">Contact your administrator to assign training domains.</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
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

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Records ({filteredLogs.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                    <th className="px-4 py-3 text-left font-bold bg-muted/50">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                        No student records found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{log.name}</td>
                        <td className="px-4 py-3 font-medium">{log.contact}</td>
                        <td className="px-4 py-3">{log.college}</td>
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
                                  disabled={verifyingId === log.fingerprint}
                                  className="h-8 w-8 p-0"
                                  title={log.attendanceVerified ? "Mark as unverified" : "Mark as attended"}
                                >
                                  {verifyingId === log.fingerprint ? (
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
    </div>
  );
};

export default EmployeeInternLogs;
