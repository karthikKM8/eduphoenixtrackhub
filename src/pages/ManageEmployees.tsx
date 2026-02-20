import { useState, useEffect } from "react";
import { UserPlus, Trash2, Loader2, Users, Eye, EyeOff, Edit2, Save, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const JOB_ROLES = [
  "Human Resources Manager",
  "Full Stack Development Trainer",
  "Data Science Trainer",
  "Machine Learning Trainer",
  "Cyber Security Trainer",
  "3D Printing Trainer",
  "IoT Trainer",
  "VLSI Design Trainer",
  "Civil Engineering Trainer",
  "HR Trainer",
  "Financial Modelling Trainer",
  "Digital Marketing Trainer",
  "Public Relations Trainer",
  "Cloud Computing Trainer",
  "HR Officer",
  "Technical Developer",
];

type Employee = { id: string; name: string; email: string; jobRoles?: string[] };

const ManageEmployees = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<Set<string>>(new Set());

  const role = localStorage.getItem("admin_role");

  const fetchEmployees = async () => {
    try {
      const result = await api.getEmployees();
      if (result.success) setEmployees(result.employees || [ ]);
    } catch {
      console.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (selectedRoles.size === 0) {
      toast({ title: "Error", description: "Please select at least one job role.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const jobRoles = Array.from(selectedRoles);
      const result = await api.registerEmployee(form.name, form.email, form.password, jobRoles);
      if (result.success) {
        toast({ title: "Employee Created", description: `${form.name} has been added with roles: ${jobRoles.join(", ")}.` });
        setForm({ name: "", email: "", password: "", confirmPassword: "" });
        setSelectedRoles(new Set());
        fetchEmployees();
      } else {
        toast({ title: "Error", description: result.error || "Failed to create employee.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const result = await api.deleteEmployee(id);
      if (result.success) {
        toast({ title: "Employee Removed", description: `${name} has been removed.` });
        setEmployees((prev) => prev.filter((e) => e.id !== id));
      } else {
        toast({ title: "Error", description: "Failed to remove employee.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    }
  };

  const handleEditRole = (id: string, currentRoles: string[]) => {
    setEditingRoleId(id);
    setEditingRoles(new Set(currentRoles));
  };

  const handleSaveRole = async (id: string) => {
    try {
      if (editingRoles.size === 0) {
        toast({ title: "Error", description: "Please select at least one job role.", variant: "destructive" });
        return;
      }
      
      const jobRoles = Array.from(editingRoles);
      const result = await api.updateEmployeeJobRoles(id, jobRoles);
      if (result.success) {
        toast({ title: "Job Roles Updated", description: `Employee roles updated to: ${jobRoles.join(", ")}.` });
        setEmployees((prev) =>
          prev.map((e) => (e.id === id ? { ...e, jobRoles } : e))
        );
        setEditingRoleId(null);
        setEditingRoles(new Set());
      } else {
        toast({ title: "Error", description: result.error || "Failed to update roles.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    }
  };

  if (role !== "superadmin") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Only Super Admins can manage employees.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Manage Employees</h1>
        <p className="mt-2 text-base text-muted-foreground">Create and manage employee accounts with job roles</p>
      </div>

      {/* Create Employee Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" /> Create Employee Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-name">Full Name</Label>
              <Input
                id="emp-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-email">Email</Label>
              <Input
                id="emp-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                placeholder="employee@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-password">Password</Label>
              <div className="relative">
                <Input
                  id="emp-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  placeholder="Min. 6 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-confirm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="emp-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Job Roles</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="text-sm">
                      {selectedRoles.size === 0 ? "Select job roles..." : `${selectedRoles.size} role${selectedRoles.size !== 1 ? "s" : ""} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="start">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {JOB_ROLES.map((role) => (
                      <div key={role} className="flex items-center gap-2">
                        <Checkbox
                          id={`role-${role}`}
                          checked={selectedRoles.has(role)}
                          onCheckedChange={(checked) => {
                            const newRoles = new Set(selectedRoles);
                            if (checked) {
                              newRoles.add(role);
                            } else {
                              newRoles.delete(role);
                            }
                            setSelectedRoles(newRoles);
                          }}
                        />
                        <label htmlFor={`role-${role}`} className="text-xs cursor-pointer flex-1">
                          {role}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedRoles.size > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Array.from(selectedRoles).map((role) => (
                    <span key={role} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {role}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating} className="gap-2">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {creating ? "Creating..." : "Create Employee"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" /> Employee Accounts ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No employee accounts found.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-xs font-bold uppercase tracking-wider text-foreground bg-muted/50">#</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground bg-muted/50">Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground bg-muted/50">Email</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-foreground bg-muted/50">Job Roles</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-foreground bg-muted/50">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp, i) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-bold text-sm">{i + 1}</TableCell>
                      <TableCell className="text-sm font-semibold">{emp.name}</TableCell>
                      <TableCell className="text-sm">{emp.email}</TableCell>
                      <TableCell>
                        {editingRoleId === emp.id ? (
                          <div className="flex gap-2 items-start flex-wrap">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <ChevronDown className="h-3.5 w-3.5 mr-1" />
                                  Edit Roles
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-3" align="start">
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {JOB_ROLES.map((role) => (
                                    <div key={role} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`edit-role-${role}`}
                                        checked={editingRoles.has(role)}
                                        onCheckedChange={(checked) => {
                                          const newRoles = new Set(editingRoles);
                                          if (checked) {
                                            newRoles.add(role);
                                          } else {
                                            newRoles.delete(role);
                                          }
                                          setEditingRoles(newRoles);
                                        }}
                                      />
                                      <label htmlFor={`edit-role-${role}`} className="text-xs cursor-pointer flex-1">
                                        {role}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveRole(emp.id)}
                              className="gap-1"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingRoleId(null)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center flex-wrap">
                            <div className="flex flex-wrap gap-1.5">
                              {(emp.jobRoles || ["Employee"]).map((role, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditRole(emp.id, emp.jobRoles || ["Employee"])}
                              className="text-primary hover:text-primary"
                              title="Edit roles"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Employee?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the account for <strong>{emp.name}</strong> ({emp.email}). This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(emp.id, emp.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageEmployees;
