import { useEffect, useState } from "react";
import { Search, Download, Calendar, FileSpreadsheet, Loader2, AlertTriangle, RefreshCw, LogOut, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

// Format ISO timestamp to IST (Indian Standard Time)
const formatTimeIST = (isoString: string): string => {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(date);
  } catch {
    return isoString;
  }
};

const columns = [
  "Name", "Email", "Device ID", "IP",
  "Browser", "OS", "Device Type", "Check-in (IST)", "Check-out (IST)", "Date", "Action",
];

const EmployeeLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[][]>([]);
  const [filtered, setFiltered] = useState<string[][]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [checkingOutEmail, setCheckingOutEmail] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 15;
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUserRow, setSelectedUserRow] = useState<string[] | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const result = await api.getLogs("employee");
      if (result.success) {
        setLogs(result.data || []);
        setFiltered(result.data || []);
      }
    } catch {
      console.error("Failed to fetch employee logs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    toast({ title: "Refreshed", description: "Logs updated successfully." });
  };

  const handleAdminCheckOut = async (email: string, name: string) => {
    setCheckingOutEmail(email);
    try {
      const result = await api.adminCheckOutEmployee(email);
      if (result.success) {
        toast({ title: "Checked Out", description: `${name} has been checked out.` });
        // Refresh logs to show updated checkout time
        const refreshed = await api.getLogs("employee");
        if (refreshed.success) {
          setLogs(refreshed.data || []);
          setFiltered(refreshed.data || []);
        }
      } else {
        toast({ title: "Error", description: result.error || "Failed to check out", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setCheckingOutEmail(null);
    }
  };

  useEffect(() => {
    let data = [...logs];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((row) => row.some((cell) => cell?.toLowerCase().includes(q)));
    }
    if (dateFilter) {
      data = data.filter((row) => row[9]?.includes(dateFilter));
    }
    setFiltered(data);
    setPage(0);
  }, [search, dateFilter, logs]);

  const exportCSV = () => {
    const header = columns.join(",");
    const rows = filtered.map((r) => r.map((c) => `"${c || ""}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_logs.csv";
    a.click();
  };

  const openUserDetailsDialog = (row: string[]) => {
    setSelectedUserRow(row);
    setUserDetailsDialogOpen(true);
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      await api.exportExcel("employee");
      toast({
        title: "Export Successful",
        description: `Exported ${logs.length} records.`,
      });
    } catch {
      toast({ title: "Export Failed", description: "Something went wrong", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!window.confirm("Are you sure you want to clear all employee logs? This action cannot be undone.")) return;
    setClearing(true);
    try {
      const result = await api.clearLogs("employee");
      if (result.success) {
        toast({ title: "Database Cleared", description: "All employee logs have been removed." });
        setLogs([]);
        setFiltered([]);
      }
    } catch {
      toast({ title: "Clear Failed", description: "Something went wrong", variant: "destructive" });
    } finally {
      setClearing(false);
    }
  };

  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Employee Logs</h1>
          <p className="text-base text-muted-foreground mt-1">{filtered.length} records found</p>
        </div>
        <div className="flex gap-2 self-start flex-wrap">
          <Button onClick={handleRefresh} variant="outline" className="gap-2" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={exportExcel} variant="default" className="gap-2" disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
          <Button onClick={handleClearDatabase} variant="destructive" className="gap-2" disabled={clearing}>
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {clearing ? "Clearing..." : "Clear Data"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-9 w-auto"
          />
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col} className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-foreground bg-muted/50">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  No records found
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((row, i) => {
                const hasCheckInTime = !!(row[7] && row[7].trim());
                const hasCheckOutTime = !!(row[8] && row[8].trim());
                const isAdmin = localStorage.getItem("admin_role") === "superadmin" || localStorage.getItem("admin_role") === "admin";
                const showCheckOutBtn = hasCheckInTime && !hasCheckOutTime && isAdmin;

                return (
                  <TableRow key={i}>
                    {row.map((cell, j) => {
                      // Name column (index 0) — clickable to open details
                      if (j === 0) {
                        return (
                          <TableCell key={j} className="whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => openUserDetailsDialog(row)}
                              className="text-primary hover:underline font-semibold transition-colors"
                              title="View details"
                            >
                              {cell || "—"}
                            </button>
                          </TableCell>
                        );
                      }
                      // Format check-in time (index 7) and check-out time (index 8) to IST
                      if (j === 7 || j === 8) {
                        return (
                          <TableCell key={j} className="whitespace-nowrap text-sm font-medium">
                            {formatTimeIST(cell)}
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={j} className="whitespace-nowrap text-sm">
                          {cell || "—"}
                        </TableCell>
                      );
                    })}
                    {/* Action column — rendered separately after row cells */}
                    <TableCell className="whitespace-nowrap text-sm">
                      {showCheckOutBtn ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdminCheckOut(row[1], row[0])}
                          disabled={checkingOutEmail === row[1]}
                          className="gap-1.5"
                        >
                          {checkingOutEmail === row[1] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LogOut className="h-3.5 w-3.5" />
                          )}
                          {checkingOutEmail === row[1] ? "Checking Out..." : "Check Out"}
                        </Button>
                      ) : hasCheckOutTime ? (
                        <span className="text-xs text-muted-foreground">Checked Out</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not Checked In</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* User Details Dialog */}
      <Dialog open={userDetailsDialogOpen} onOpenChange={setUserDetailsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{selectedUserRow?.[0] || "User Details"}</DialogTitle>
            <DialogDescription>
              Complete information and actions for this employee
            </DialogDescription>
          </DialogHeader>
          {selectedUserRow && (
            <div className="space-y-4 py-2">
              {/* Personal Information */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Name</Label>
                  <p className="text-sm font-medium">{selectedUserRow[0]}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{selectedUserRow[1] || "—"}</p>
                </div>
              </div>

              {/* Device Information */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Device ID</Label>
                  <p className="text-sm font-mono text-muted-foreground break-all">{selectedUserRow[2] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">IP Address</Label>
                  <p className="text-sm font-mono">{selectedUserRow[3] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Browser</Label>
                  <p className="text-sm">{selectedUserRow[4] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">OS</Label>
                  <p className="text-sm">{selectedUserRow[5] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Device Type</Label>
                  <p className="text-sm">{selectedUserRow[6] || "—"}</p>
                </div>
              </div>

              {/* Attendance Information */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Check-in (IST)</Label>
                  <p className="text-sm font-medium">{formatTimeIST(selectedUserRow[7])}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Check-out (IST)</Label>
                  <p className="text-sm font-medium">{formatTimeIST(selectedUserRow[8])}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Date</Label>
                  <p className="text-sm">{selectedUserRow[9] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Status</Label>
                  {selectedUserRow[7] && selectedUserRow[7].trim() ? (
                    <p className={`text-sm font-medium ${
                      selectedUserRow[8] && selectedUserRow[8].trim()
                        ? "text-muted-foreground"
                        : "text-green-600"
                    }`}>
                      {selectedUserRow[8] && selectedUserRow[8].trim() ? "Checked Out" : "Currently Checked In"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Checked In</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              {(() => {
                const hasCheckInTime = !!(selectedUserRow[7] && selectedUserRow[7].trim());
                const hasCheckOutTime = !!(selectedUserRow[8] && selectedUserRow[8].trim());
                const isAdmin = localStorage.getItem("admin_role") === "superadmin" || localStorage.getItem("admin_role") === "admin";
                const showCheckOutBtn = hasCheckInTime && !hasCheckOutTime && isAdmin;

                if (!showCheckOutBtn) return null;

                return (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handleAdminCheckOut(selectedUserRow[1], selectedUserRow[0]);
                        setUserDetailsDialogOpen(false);
                      }}
                      disabled={checkingOutEmail === selectedUserRow[1]}
                      className="gap-2 flex-1"
                    >
                      {checkingOutEmail === selectedUserRow[1] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      {checkingOutEmail === selectedUserRow[1] ? "Checking Out..." : "Check Out"}
                    </Button>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeLogs;
