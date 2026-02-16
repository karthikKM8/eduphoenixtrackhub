import { useEffect, useState } from "react";
import { Users, Eye, LogIn, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

type Stats = {
  internsToday: number;
  visitorsToday: number;
  checkedIn: number;
  totalRecords: number;
};

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) => (
  <Card className="shadow-card">
    <CardContent className="flex items-center gap-4 p-6">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold text-card-foreground">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const DashboardOverview = () => {
  const [stats, setStats] = useState<Stats>({
    internsToday: 0,
    visitorsToday: 0,
    checkedIn: 0,
    totalRecords: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await api.getStats();
        if (result.success) setStats(result.stats);
      } catch {
        console.error("Failed to fetch stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="mt-1 text-muted-foreground">Today's activity at a glance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Interns Today" value={stats.internsToday} color="gradient-primary" />
        <StatCard icon={Eye} label="Visitors Today" value={stats.visitorsToday} color="gradient-accent" />
        <StatCard icon={LogIn} label="Currently Checked In" value={stats.checkedIn} color="bg-success" />
        <StatCard icon={Database} label="Total Records" value={stats.totalRecords} color="bg-muted" />
      </div>
    </div>
  );
};

export default DashboardOverview;
