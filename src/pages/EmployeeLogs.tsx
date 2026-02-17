import { useEffect, useState } from "react";
import { Search, Download, Calendar, FileSpreadsheet, Loader2, AlertTriangle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const columns = [
  "Name", "Email", "Device ID", "IP",
  "Browser", "OS", "Device Type", "Check-in", "Check-out", "Date",
];

const EmployeeLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<string[][]>([]);
  const [filtered, setFiltered] = useState<string[][]>([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 15;

  useEffect(() => {
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
      }
    };
    fetchLogs();
  }, []);

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

  const exportExcel = async () => {
    setExporting(true);
    try {
      await api.exportExcel("employee");
      toast({
        title: "Export Successful",
        description: logs.length >= 100
          ? `Exported ${logs.length} records. Data has been cleared from the database.`
          : `Exported ${logs.length} records.`,
      });
      if (logs.length >= 100) {
        const result = await api.getLogs("employee");
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Employee Logs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} records found</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button onClick={exportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={exportExcel} variant="default" className="gap-2" disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {exporting ? "Exporting..." : "Export Excel"}
          </Button>
        </div>
      </div>

      {logs.length >= 100 && (
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
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider">
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
              pageData.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="whitespace-nowrap text-sm">
                      {cell || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
    </div>
  );
};

export default EmployeeLogs;
