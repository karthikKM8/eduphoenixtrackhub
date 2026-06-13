import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, Plus, Pencil, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

const ManageCourses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState<{name: string; enabled: boolean}[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [updatingCourses, setUpdatingCourses] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      const result = await api.getCourses();
      if (result.success && result.courses) {
        setCourses(result.courses);
      } else {
        toast({ title: "Error", description: "Failed to load courses", variant: "destructive" });
      }
      setLoadingCourses(false);
    };
    fetchCourses();
  }, [toast]);

  const handleUpdateCourses = async () => {
    setUpdatingCourses(true);
    const result = await api.updateCourses(courses);
    if (result.success) {
      toast({ title: "Success", description: "Courses updated successfully." });
    } else {
      toast({ title: "Error", description: "Failed to update courses", variant: "destructive" });
    }
    setUpdatingCourses(false);
  };

  const handleAddDomain = () => {
    if (!newDomain.trim()) return;
    setCourses([...courses, { name: newDomain.trim(), enabled: true }]);
    setNewDomain("");
  };

  const startEdit = (idx: number, name: string) => {
    setEditingIdx(idx);
    setEditValue(name);
  };

  const saveEdit = (idx: number) => {
    if (!editValue.trim()) return;
    const newCourses = [...courses];
    newCourses[idx].name = editValue.trim();
    setCourses(newCourses);
    setEditingIdx(null);
  };

  const removeDomain = (idx: number) => {
    if (!window.confirm("Are you sure you want to remove this domain?")) return;
    const newCourses = courses.filter((_, i) => i !== idx);
    setCourses(newCourses);
  };

  if (loadingCourses) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Manage Internship Domains
          </CardTitle>
          <CardDescription>
            Manage internship domains. You can add new ones, rename existing ones, or toggle their availability for new registrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            <Input 
              placeholder="Enter new domain name..." 
              value={newDomain} 
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
            />
            <Button onClick={handleAddDomain} className="gap-2">
              <Plus className="h-4 w-4" /> Add Domain
            </Button>
          </div>

          <div className="space-y-3">
            {courses.map((course, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg border p-3 bg-card transition-colors hover:bg-accent/50">
                {editingIdx === idx ? (
                  <div className="flex flex-1 items-center gap-2 mr-4">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(idx)}
                      autoFocus
                      className="h-8 text-sm"
                    />
                    <Button size="sm" variant="ghost" onClick={() => saveEdit(idx)} className="h-8 w-8 p-0 shrink-0">
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 mr-4">
                    <span className="font-medium text-sm truncate">{course.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(idx, course.name)} className="h-7 w-7 p-0 shrink-0 opacity-50 hover:opacity-100">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-3 shrink-0">
                  <Switch 
                    checked={course.enabled}
                    onCheckedChange={(checked) => {
                      const newCourses = [...courses];
                      newCourses[idx].enabled = checked;
                      setCourses(newCourses);
                    }}
                  />
                  <Button size="sm" variant="ghost" onClick={() => removeDomain(idx)} className="h-7 w-7 p-0 text-destructive opacity-50 hover:opacity-100 hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleUpdateCourses} disabled={updatingCourses}>
            {updatingCourses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ManageCourses;
