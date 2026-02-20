import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InternForm from "./pages/InternForm";
import VisitorForm from "./pages/VisitorForm";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmployeeInternLogs from "./pages/EmployeeInternLogs";
import AdminLogin from "./pages/AdminLogin";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./pages/DashboardOverview";
import InternLogs from "./pages/InternLogs";
import VisitorLogs from "./pages/VisitorLogs";
import EmployeeLogs from "./pages/EmployeeLogs";
import ManageEmployees from "./pages/ManageEmployees";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/intern" element={<InternForm />} />
          <Route path="/visitor" element={<VisitorForm />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/employee" element={<AdminLogin />} />
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/dashboard/internlogs" element={<EmployeeInternLogs />} />
          <Route path="/admin/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="interns" element={<InternLogs />} />
            <Route path="visitors" element={<VisitorLogs />} />
            <Route path="employees" element={<EmployeeLogs />} />
            <Route path="manage-employees" element={<ManageEmployees />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
