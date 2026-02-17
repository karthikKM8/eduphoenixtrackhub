import { useState, useEffect } from "react";
import { UserPlus, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Employee = { id: string; name: string; email: string };

const ManageEmployees = () => {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  const role = localStorage.getItem("admin_role");

  const fetchEmployees = async () => {
    try {
      const result = await api.getEmployees();
      if (result.success) setEmployees(result.employees || []);
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
    setCreating(true);
    try {
      const result = await api.registerEmployee(form.name, form.email, form.password);
      if (result.success) {
        toast({ title: "Employee Created", description: `${form.name} has been added.` });
        setForm({ name: "", email: "", password: "", confirmPassword: "" });
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
        <p className="mt-1 text-muted-foreground">Create employee accounts and assign credentials</p>
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
              <Input
                id="emp-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
                placeholder="Min. 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-confirm">Confirm Password</Label>
              <Input
                id="emp-confirm"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
                placeholder="••••••••"
              />
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
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp, i) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.email}</TableCell>
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
