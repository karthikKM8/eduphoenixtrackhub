import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getDeviceInfo } from "@/lib/deviceInfo";
import { api } from "@/lib/api";

const VisitorForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    purpose: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const deviceInfo = getDeviceInfo();
      const result = await api.registerVisitor({
        ...formData,
        fingerprint: deviceInfo.fingerprint,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
      });

      if (result.success) {
        setSubmitted(true);
        toast({ title: "Visit Logged!", description: "Thank you for visiting." });
      } else {
        toast({ title: "Error", description: result.error || "Something went wrong", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="dashboard-shell flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="dashboard-mesh pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -left-32 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-[100px] animate-pulse" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

        <Card className="dashboard-panel w-full max-w-md animate-fade-in text-center relative z-10 shadow-2xl border-white/20">
          <CardContent className="pt-10 pb-10 space-y-5">
            <div className="mx-auto mb-2">
              <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-14 object-contain mx-auto" />
            </div>
            <div className="mx-auto h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center">
              <UserCheck className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold text-card-foreground">Thank You!</h2>
            <p className="text-muted-foreground">Your visit has been logged successfully.</p>
            <Button onClick={() => navigate("/")} variant="outline" className="mt-4">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard-shell flex min-h-screen flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="dashboard-mesh pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -left-32 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-[100px] animate-pulse" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-primary/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <div className="p-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span className="font-medium">Back to Home</span>
        </button>

        <Card className="dashboard-panel animate-fade-in p-2 sm:p-4 shadow-2xl border-white/20">
          <CardHeader>
            <div className="mb-3">
              <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-12 object-contain" />
            </div>
            <CardTitle className="font-display text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-accent-foreground" />
              </div>
              Visitor Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { id: "name", label: "Full Name", type: "text" },
                { id: "email", label: "Email Address", type: "email" },
                { id: "phone", label: "Phone Number", type: "tel" },
                { id: "college", label: "College / Organization", type: "text" },
              ].map(({ id, label, type }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
                  <Input
                    id={id}
                    type={type}
                    value={formData[id as keyof typeof formData]}
                    onChange={(e) => setFormData((prev) => ({ ...prev, [id]: e.target.value }))}
                    required
                    placeholder={`Enter ${label.toLowerCase()}`}
                    className="bg-background/50 backdrop-blur-sm focus:bg-background transition-colors"
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="purpose" className="text-sm font-medium">Purpose of Visit</Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                  required
                  placeholder="Describe the purpose of your visit"
                  rows={3}
                  className="bg-background/50 backdrop-blur-sm focus:bg-background transition-colors"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-orange-500 text-accent-foreground hover:opacity-90 shadow-lg shadow-accent/25 transition-all active:scale-[0.98]" disabled={submitting}>
                {submitting ? "Submitting..." : "Visited"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VisitorForm;
