import React, { useEffect, useState } from "react";
import { 
  Users, Eye, LogIn, Database, Briefcase, TrendingUp, Calendar, 
  ArrowRight, BarChart3, FileText, Settings, Clock, Activity,
  CheckCircle2, AlertCircle, RefreshCw, BookOpen
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { cache } from "@/lib/cache";

type Stats = {
  internsToday: number;
  visitorsToday: number;
  checkedIn: number;
  employeesToday: number;
  employeesCheckedIn: number;
  totalRecords: number;
};

const StatCard = React.memo(({
  icon: Icon,
  label,
  value,
  color,
  trend,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  trend?: { value: number; up: boolean };
  description?: string;
}) => (
  <Card className="dashboard-panel group relative overflow-hidden transition-all duration-300 border-0 bg-gradient-to-br">
    <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-500 from-white/5 to-white/0" />
    <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${color}`} />
    <CardContent className="p-7 relative z-10">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg ${color}`}>
            <Icon className="h-7 w-7 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-bold bg-background/50 px-2 py-1 rounded-full backdrop-blur-sm ${trend.up ? "text-success" : "text-destructive"}`}>
              <TrendingUp className="h-4 w-4" />
              {trend.value}%
            </div>
          )}
        </div>
        <div>
          <p className="text-sm uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          <p className="font-display text-4xl font-bold text-foreground mt-2">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
));

StatCard.displayName = "StatCard";

const QuickActionCard = React.memo(({
  icon: Icon,
  title,
  description,
  onClick,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}) => (
  <button
    onClick={onClick}
    className="group relative overflow-hidden rounded-2xl border border-border/50 p-4 text-left transition-all duration-300 shadow-card hover:shadow-card-hover bg-card/60 backdrop-blur-xl hover:bg-white/10 dark:hover:bg-white/5"
  >
    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 from-white/10 to-transparent" />
    <div className="flex items-start gap-4 relative z-10">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 pt-1">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-[-10px] group-hover:translate-x-0">
        <ArrowRight className="h-4 w-4 text-primary" />
      </div>
    </div>
  </button>
));

QuickActionCard.displayName = "QuickActionCard";

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    internsToday: 0,
    visitorsToday: 0,
    checkedIn: 0,
    employeesToday: 0,
    employeesCheckedIn: 0,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const adminRole = localStorage.getItem("admin_role");
  const isSuperAdmin = adminRole === "superadmin";

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const result = await api.getStats();
      if (result.success) {
        setStats(result.stats);
      } else {
        toast({ title: "Error", description: "Failed to load dashboard stats", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
      toast({ title: "Error", description: "Failed to load dashboard data. Please try refreshing.", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache before refreshing to force fresh data
    const today = new Date().toISOString().split("T")[0];
    cache.invalidate(`stats-${today}`);
    await fetchStats();
    toast({ title: "Refreshed", description: "Dashboard updated successfully." });
  };

  // Calculate percentages
  const internCheckInPercent = stats.internsToday > 0 ? Math.round((stats.checkedIn / stats.internsToday) * 100) : 0;
  const employeeCheckInPercent = stats.employeesToday > 0 ? Math.round((stats.employeesCheckedIn / stats.employeesToday) * 100) : 0;

  // Get current time and greeting
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 18 ? "Good Afternoon" : "Good Evening";
  const currentDate = new Date().toLocaleDateString("en-IN", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in relative z-10">
      {/* Header Section (Span 8) */}
      <div className="dashboard-panel md:col-span-12 lg:col-span-8 rounded-[32px] p-8 sm:p-10 bg-gradient-to-br from-primary/10 via-background/50 to-transparent border border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <div className="w-64 h-64 bg-primary rounded-full blur-3xl" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5 sm:gap-6">
            <div className="p-3 bg-foreground/5 backdrop-blur-md rounded-2xl border border-border shadow-xl">
              <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-12 sm:h-16 object-contain rounded-xl" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Admin Portal</span>
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent pb-1">{greeting}! 👋</h1>
              <p className="mt-2 text-sm sm:text-base text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {currentDate}
              </p>
            </div>
          </div>
          <Button
            onClick={handleRefresh}
            className="gap-2 bg-white/80 dark:bg-white/10 text-foreground hover:bg-white dark:hover:bg-white/20 shadow-sm backdrop-blur-md border border-white/20 rounded-xl h-12 px-6"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Updating..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {/* System Status (Span 4) */}
      <Card className="dashboard-panel md:col-span-12 lg:col-span-4 rounded-[32px] border-0 p-6 flex flex-col justify-center">
        <CardHeader className="pb-3 px-0 pt-0">
          <CardTitle className="flex items-center gap-2 font-display text-xl">
            <Activity className="h-6 w-6 text-primary" />
            System Status
          </CardTitle>
          <CardDescription>Current system information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0 pb-0">
          <div className="flex items-center justify-between p-4 bg-success/10 rounded-2xl border border-success/20">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm font-medium">Status</span>
            </div>
            <span className="text-sm font-bold text-success">Operational</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-border">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Last Updated</span>
            </div>
            <span className="text-sm font-mono">{new Date().toLocaleTimeString("en-IN")}</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-amber/10 rounded-2xl border border-amber/20">
            <div className="flex items-center gap-3">
              <Database className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Total Records</span>
            </div>
            <span className="text-sm font-bold">{stats.totalRecords.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid (Span 12) */}
      <div className="md:col-span-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-5">Today's Activity</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard 
            icon={Users}
            label="Interns Today"
            value={stats.internsToday}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            trend={{ value: 12, up: true }}
          />
          <StatCard
            icon={CheckCircle2}
            label="Interns Checked In"
            value={stats.checkedIn}
            color="bg-gradient-to-br from-green-500 to-green-600"
            description={`${internCheckInPercent}% present`}
            trend={{ value: 8, up: true }}
          />
          <StatCard
            icon={Briefcase}
            label="Employees Today"
            value={stats.employeesToday}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <StatCard
            icon={Activity}
            label="Employees Checked In"
            value={stats.employeesCheckedIn}
            color="bg-gradient-to-br from-indigo-500 to-indigo-600"
            description={`${employeeCheckInPercent}% present`}
          />
          <StatCard
            icon={Eye}
            label="Visitors Today"
            value={stats.visitorsToday}
            color="bg-gradient-to-br from-amber-500 to-amber-600"
          />
          <StatCard
            icon={Database}
            label="Total Records"
            value={stats.totalRecords}
            color="bg-gradient-to-br from-slate-500 to-slate-600"
            description="Today's total"
          />
        </div>
      </div>

      {/* Quick Action Section (Span 6) */}
      <div className="md:col-span-12 lg:col-span-6 dashboard-panel rounded-[32px] p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-6">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <QuickActionCard
            icon={FileText}
            title="View Intern Logs"
            description="Check attendance records"
            onClick={() => navigate("interns")}
            color="bg-blue-500"
          />
          <QuickActionCard
            icon={FileText}
            title="View Employee Logs"
            description="Employee attendance"
            onClick={() => navigate("employees")}
            color="bg-purple-500"
          />
          <QuickActionCard
            icon={Eye}
            title="View Visitor Logs"
            description="Visitor check-ins"
            onClick={() => navigate("visitors")}
            color="bg-amber-500"
          />
          {isSuperAdmin && (
            <QuickActionCard
              icon={Users}
              title="Manage Employees"
              description="Add/edit employees"
              onClick={() => navigate("manage-employees")}
              color="bg-green-500"
            />
          )}
        </div>
      </div>

      {/* Attendance Summary (Span 6) */}
      <div className="md:col-span-12 lg:col-span-6 dashboard-panel rounded-[32px] p-6 sm:p-8 flex flex-col justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground mb-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Attendance Summary
          </h2>
          <p className="text-sm text-muted-foreground mb-8">Today's check-in overview</p>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium">Intern Check-in Rate</span>
                <span className="text-sm font-bold text-primary">{internCheckInPercent}%</span>
              </div>
              <div className="h-3 bg-foreground/5 rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                  style={{ width: `${internCheckInPercent}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium">Employee Check-in Rate</span>
                <span className="text-sm font-bold text-primary">{employeeCheckInPercent}%</span>
              </div>
              <div className="h-3 bg-foreground/5 rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${employeeCheckInPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <Button className="w-full gap-2 mt-8 h-12 rounded-xl text-md font-semibold" onClick={() => navigate("interns")}>
          <FileText className="h-5 w-5" />
          View Detailed Logs
        </Button>
      </div>

      {/* Admin Settings Cards (Span 12) */}
      {isSuperAdmin && (
        <div className="md:col-span-12 dashboard-panel rounded-[32px] p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">Administration</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Button 
              variant="outline" 
              className="gap-4 justify-start h-auto py-4 px-5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 border-border"
              onClick={() => navigate("manage-employees")}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm text-foreground">Manage Employees</div>
                <div className="text-xs text-muted-foreground mt-0.5">Add, edit, or remove users</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="gap-4 justify-start h-auto py-4 px-5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 border-border"
              onClick={() => navigate("manage-courses")}
            >
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm text-foreground">Manage Courses</div>
                <div className="text-xs text-muted-foreground mt-0.5">Enable or disable domains</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="gap-4 justify-start h-auto py-4 px-5 rounded-2xl bg-foreground/5 hover:bg-foreground/10 border-border"
              onClick={() => navigate("/admin/login")}
            >
              <div className="h-10 w-10 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0">
                <Settings className="h-5 w-5 text-foreground" />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm text-foreground">Settings</div>
                <div className="text-xs text-muted-foreground mt-0.5">Configure system settings</div>
              </div>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
