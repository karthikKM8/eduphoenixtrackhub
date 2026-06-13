import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Users, Eye, Briefcase, LogOut, Menu, X, UserPlus, BookOpen, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/dashboard/interns", label: "Intern Logs", icon: Users },
  { to: "/admin/dashboard/employees", label: "Employee Logs", icon: Briefcase },
  { to: "/admin/dashboard/visitors", label: "Visitor Logs", icon: Eye },
];

const superadminNavItems = [
  ...baseNavItems,
  { to: "/admin/dashboard/manage-employees", label: "Manage Employees", icon: UserPlus },
  { to: "/admin/dashboard/manage-courses", label: "Manage Courses", icon: BookOpen },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) navigate("/admin/login");
    
    // Initialize theme
    const savedTheme = localStorage.getItem("theme");
    const isDarkTheme = savedTheme === "dark" || (!savedTheme && document.documentElement.classList.contains("dark"));
    setIsDark(isDarkTheme);
    if (isDarkTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [navigate]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    navigate("/admin/login");
  };

  const role = localStorage.getItem("admin_role") || "admin";
  const navItems = role === "superadmin" ? superadminNavItems : baseNavItems;

  return (
    <div className="dashboard-shell flex min-h-screen">
      {/* Animated Background Elements */}
      <div className="dashboard-mesh pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none fixed -left-32 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none fixed right-0 top-1/3 h-80 w-80 rounded-full bg-accent/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border shadow-2xl transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center gap-4 border-b border-sidebar-border/50 px-6 mt-2">
          <div className="p-2 bg-white rounded-xl shadow-sm">
            <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-8 object-contain" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-sidebar-foreground tracking-wide">EduPhoenix</h2>
            <div className="inline-flex items-center gap-1.5 mt-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-xs text-sidebar-foreground/70 uppercase tracking-wider font-semibold">{role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  active
                    ? "bg-primary/15 text-primary shadow-sm border border-primary/20"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border/50 p-4 mb-2 space-y-2">
          <button
            onClick={toggleTheme}
            className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-300"
          >
            {isDark ? <Sun className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" /> : <Moon className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-12" />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
          >
            <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-1" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col relative z-10 w-full overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-6 lg:hidden sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-display font-bold text-lg tracking-wide">EduPhoenix Admin</h1>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
