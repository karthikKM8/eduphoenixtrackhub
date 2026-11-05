import { useEffect, useState } from "react";
import { FileUp, FileText, Trash2, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type DocumentResource = {
  id: string;
  domainSlug: string;
  type: "report" | "logsheet";
  duration?: number | null;
  name: string;
  url: string;
  storagePath: string;
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ManageDocuments = () => {
  const { toast } = useToast();
  const [domains, setDomains] = useState<{ name: string; enabled: boolean }[]>([]);
  const [resources, setResources] = useState<DocumentResource[]>([]);
  const [domain, setDomain] = useState("");
  const [type, setType] = useState<"report" | "logsheet">("report");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [coursesResult, resourcesResult] = await Promise.all([api.getCourses(), api.getDocumentResources()]);
    if (coursesResult.success && coursesResult.courses) {
      setDomains(coursesResult.courses);
      if (!domain && coursesResult.courses[0]) setDomain(slugify(coursesResult.courses[0].name));
    }
    if (resourcesResult.success) setResources(resourcesResult.resources as DocumentResource[]);
    else toast({ title: "Error", description: resourcesResult.error || "Failed to load documents", variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || !domain || (type === "logsheet" && !duration)) return;
    setUploading(true);
    try {
      const result = await api.uploadDocumentResource(file, domain, type, type === "logsheet" ? Number(duration) : undefined);
      if (!result.success) {
        toast({ title: "Upload failed", description: result.error || "Could not upload document", variant: "destructive" });
        return;
      }
      toast({ title: "Document uploaded", description: `${file.name} is now available for ${domain}.` });
      setFile(null);
      const input = document.getElementById("document-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadData();
    } catch {
      toast({ title: "Upload failed", description: "Could not upload document", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resource: DocumentResource) => {
    if (!window.confirm(`Remove ${resource.name}?`)) return;
    setDeletingId(resource.id);
    try {
      const result = await api.deleteDocumentResource(resource);
      if (result.success) {
        setResources((current) => current.filter((item) => item.id !== resource.id));
        toast({ title: "Document removed", description: resource.name });
      } else {
        toast({ title: "Removal failed", description: result.error || "Could not remove document", variant: "destructive" });
      }
    } catch {
      toast({ title: "Removal failed", description: "Could not remove document", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (localStorage.getItem("admin_role") !== "superadmin") {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Only Super Admins can manage documents.</div>;
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">Manage Reports & Logsheets</h1>
        <p className="mt-2 text-muted-foreground">Upload or remove domain-specific reports and duration-specific logsheets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" /> Add Document</CardTitle>
          <CardDescription>Reports apply to a domain. Logsheets also require a 1 to 6 month duration.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="document-domain">Internship Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger id="document-domain"><SelectValue placeholder="Select domain" /></SelectTrigger>
                <SelectContent>
                  {domains.map((course) => <SelectItem key={course.name} value={slugify(course.name)}>{course.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="document-type">Document Type</Label>
              <Select value={type} onValueChange={(value: "report" | "logsheet") => { setType(value); if (value === "report") setDuration(""); }}>
                <SelectTrigger id="document-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="logsheet">Logsheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "logsheet" && (
              <div className="space-y-1.5">
                <Label htmlFor="document-duration">Logsheet Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="document-duration"><SelectValue placeholder="Select duration" /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 6 }, (_, index) => String(index + 1)).map((value) => <SelectItem key={value} value={value}>{value} {value === "1" ? "Month" : "Months"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="document-file">File</Label>
              <Input id="document-file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} required />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" className="gap-2" disabled={!file || !domain || (type === "logsheet" && !duration) || uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" /> Uploaded Documents</CardTitle>
          <CardDescription>{resources.length} managed document{resources.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No uploaded documents yet.</p> : (
            <div className="space-y-3">
              {resources.map((resource) => (
                <div key={resource.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3"><FileText className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate font-medium">{resource.name}</p><p className="text-xs text-muted-foreground">{resource.domainSlug} · {resource.type}{resource.duration ? ` · ${resource.duration} months` : ""}</p></div></div>
                  <Button type="button" size="sm" variant="ghost" className="self-end text-destructive hover:bg-destructive/10 hover:text-destructive sm:self-auto" onClick={() => handleDelete(resource)} disabled={deletingId === resource.id}><Trash2 className="mr-2 h-4 w-4" />Remove</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageDocuments;
