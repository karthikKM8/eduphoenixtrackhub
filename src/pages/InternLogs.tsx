import { useEffect, useState } from "react";
import { Search, Download, Calendar, FileSpreadsheet, Loader2, AlertTriangle, IndianRupee, RefreshCw, LogOut, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
  "Name", "Contact", "College", "Domain", "Device ID", "IP",
  "Browser", "OS", "Device Type", "Check-in (IST)", "Check-out (IST)", "Date", "Fee Due", "Action",
];

const InternLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[][]>([]);
  const [filtered, setFiltered] = useState<string[][]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 15;
  const isSuperAdmin = localStorage.getItem("admin_role") === "superadmin";

  // Fee dialog state
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [feeTarget, setFeeTarget] = useState<{ name: string; fingerprint: string; currentFee: string } | null>(null);
  const [feeAmount, setFeeAmount] = useState("");
  const [feeMessage, setFeeMessage] = useState("");
  const [updatingFee, setUpdatingFee] = useState(false);
  const [checkingOutFingerprint, setCheckingOutFingerprint] = useState<string | null>(null);
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUserRow, setSelectedUserRow] = useState<string[] | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const result = await api.getLogs("intern");
      if (result.success) {
        setLogs(result.data || []);
        setFiltered(result.data || []);
      }
    } catch {
      console.error("Failed to fetch intern logs");
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

  const handleAdminCheckOut = async (fingerprint: string, name: string) => {
    setCheckingOutFingerprint(fingerprint);
    try {
      const result = await api.adminCheckOutIntern(fingerprint);
      if (result.success) {
        toast({ title: "Checked Out", description: `${name} has been checked out.` });
        // Refresh logs to show updated checkout time
        const refreshed = await api.getLogs("intern");
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
      setCheckingOutFingerprint(null);
    }
  };

  useEffect(() => {
    let data = [...logs];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((row) => row.some((cell) => cell?.toLowerCase().includes(q)));
    }
    if (dateFilter) {
      data = data.filter((row) => row[11]?.includes(dateFilter));
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
    a.download = "intern_logs.csv";
    a.click();
  };

  const openFeeDialog = (row: string[]) => {
    setFeeTarget({
      name: row[0] || "Unknown",
      fingerprint: row[4] || "",
      currentFee: row[12] || "0",
    });
    setFeeAmount(row[12] && row[12] !== "0" ? row[12] : "");
    setFeeMessage("");
    setFeeDialogOpen(true);
  };

  const openUserDetailsDialog = (row: string[]) => {
    setSelectedUserRow(row);
    setUserDetailsDialogOpen(true);
  };

  const handleUpdateFee = async () => {
    if (!feeTarget) return;
    setUpdatingFee(true);
    try {
      const result = await api.updateFeeDue(
        feeTarget.fingerprint,
        parseFloat(feeAmount) || 0,
        feeMessage || undefined
      );
      if (result.success) {
        toast({
          title: parseFloat(feeAmount) > 0 ? "Fee Due Updated" : "Fee Due Cleared",
          description: parseFloat(feeAmount) > 0
            ? `₹${feeAmount} fee set for ${feeTarget.name}. They will be notified on next login.`
            : `Fee due cleared for ${feeTarget.name}.`,
        });
        setFeeDialogOpen(false);
        // Refresh logs
        const refreshed = await api.getLogs("intern");
        if (refreshed.success) {
          setLogs(refreshed.data || []);
          setFiltered(refreshed.data || []);
        }
      } else {
        toast({ title: "Error", description: result.error || "Failed to update fee", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    } finally {
      setUpdatingFee(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      await api.exportExcel("intern");
      toast({
        title: "Export Successful",
        description: logs.length >= 1000
          ? `Exported ${logs.length} records. Data has been cleared from the database.`
          : `Exported ${logs.length} records.`,
      });
      // Refresh logs after export (data may have been deleted)
      if (logs.length >= 1000) {
        const result = await api.getLogs("intern");
        if (result.success) {
          setLogs(result.data || []);
          setFiltered(result.data || []);
        }
      }
    } catch {
      toast({ title: "Export Failed", description: "Something went wrong", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Intern Logs</h1>
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
        </div>
      </div>

      {logs.length >= 1000 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{logs.length} records in database. Exporting Excel will download all data and clear the database.</span>
        </div>
      )}

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
                const hasCheckInTime = !!(row[9] && row[9].trim());
                const hasCheckOutTime = !!(row[10] && row[10].trim());
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
                      // Format check-in time (index 9) and check-out time (index 10) to IST
                      if (j === 9 || j === 10) {
                        return (
                          <TableCell key={j} className="whitespace-nowrap text-sm font-medium">
                            {formatTimeIST(cell)}
                          </TableCell>
                        );
                      }
                      // Fee Due column (index 12) — special rendering
                      if (j === 12) {
                        const amt = parseFloat(cell) || 0;
                        return (
                          <TableCell key={j} className="whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className={amt > 0 ? "font-bold text-destructive" : "text-muted-foreground"}>
                                {amt > 0 ? `₹${amt.toLocaleString("en-IN")}` : "—"}
                              </span>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => openFeeDialog(row)}
                                  className="ml-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                  title="Edit fee due"
                                >
                                  <IndianRupee className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
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
                          onClick={() => handleAdminCheckOut(row[4], row[0])}
                          disabled={checkingOutFingerprint === row[4]}
                          className="gap-1.5"
                        >
                          {checkingOutFingerprint === row[4] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LogOut className="h-3.5 w-3.5" />
                          )}
                          {checkingOutFingerprint === row[4] ? "Checking Out..." : "Check Out"}
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
              Complete information and actions for this intern
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
                  <Label className="text-xs uppercase text-muted-foreground">Contact</Label>
                  <p className="text-sm font-medium">{selectedUserRow[1] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">College</Label>
                  <p className="text-sm font-medium">{selectedUserRow[2] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Domain</Label>
                  <p className="text-sm font-medium">{selectedUserRow[3] || "—"}</p>
                </div>
              </div>

              {/* Device Information */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Device ID</Label>
                  <p className="text-sm font-mono text-muted-foreground break-all">{selectedUserRow[4] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">IP Address</Label>
                  <p className="text-sm font-mono">{selectedUserRow[5] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Browser</Label>
                  <p className="text-sm">{selectedUserRow[6] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">OS</Label>
                  <p className="text-sm">{selectedUserRow[7] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Device Type</Label>
                  <p className="text-sm">{selectedUserRow[8] || "—"}</p>
                </div>
              </div>

              {/* Attendance Information */}
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Check-in (IST)</Label>
                  <p className="text-sm font-medium">{formatTimeIST(selectedUserRow[9])}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Check-out (IST)</Label>
                  <p className="text-sm font-medium">{formatTimeIST(selectedUserRow[10])}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Date</Label>
                  <p className="text-sm">{selectedUserRow[11] || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs uppercase text-muted-foreground">Status</Label>
                  {selectedUserRow[9] && selectedUserRow[9].trim() ? (
                    <p className={`text-sm font-medium ${
                      selectedUserRow[10] && selectedUserRow[10].trim()
                        ? "text-muted-foreground"
                        : "text-green-600"
                    }`}>
                      {selectedUserRow[10] && selectedUserRow[10].trim() ? "Checked Out" : "Currently Checked In"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Checked In</p>
                  )}
                </div>
              </div>

              {/* Fee Due */}
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Fee Due</Label>
                <div className="flex items-center gap-2.5 pt-1">
                  {(() => {
                    const amt = parseFloat(selectedUserRow[12]) || 0;
                    return (
                      <>
                        <span className={amt > 0 ? "text-lg font-bold text-destructive" : "text-muted-foreground"}>
                          {amt > 0 ? `₹${amt.toLocaleString("en-IN")}` : "—"}
                        </span>
                        {isSuperAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUserDetailsDialogOpen(false);
                              openFeeDialog(selectedUserRow);
                            }}
                            className="gap-1.5"
                          >
                            <IndianRupee className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Actions */}
              {(() => {
                const hasCheckInTime = !!(selectedUserRow[9] && selectedUserRow[9].trim());
                const hasCheckOutTime = !!(selectedUserRow[10] && selectedUserRow[10].trim());
                const isAdmin = localStorage.getItem("admin_role") === "superadmin" || localStorage.getItem("admin_role") === "admin";
                const showCheckOutBtn = hasCheckInTime && !hasCheckOutTime && isAdmin;

                if (!showCheckOutBtn) return null;

                return (
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handleAdminCheckOut(selectedUserRow[4], selectedUserRow[0]);
                        setUserDetailsDialogOpen(false);
                      }}
                      disabled={checkingOutFingerprint === selectedUserRow[4]}
                      className="gap-2 flex-1"
                    >
                      {checkingOutFingerprint === selectedUserRow[4] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      {checkingOutFingerprint === selectedUserRow[4] ? "Checking Out..." : "Check Out"}
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

      {/* Fee Due Edit Dialog (superadmin only) */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" /> Update Fee Due
            </DialogTitle>
            <DialogDescription>
              Set or clear a fee due for <strong>{feeTarget?.name}</strong>. The student will see a
              notification popup on their next login or check-in/out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="feeAmount">Fee Amount (₹)</Label>
              <Input
                id="feeAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 5000"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Set to 0 to clear the fee due.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="feeMessage">Custom Message (optional)</Label>
              <Textarea
                id="feeMessage"
                placeholder="Leave blank for default message"
                value={feeMessage}
                onChange={(e) => setFeeMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFee} disabled={updatingFee}>
              {updatingFee ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {updatingFee ? "Updating..." : parseFloat(feeAmount) > 0 ? "Set Fee Due" : "Clear Fee Due"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InternLogs;
