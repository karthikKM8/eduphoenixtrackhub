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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-card animate-fade-in text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </button>

        <Card className="shadow-card animate-fade-in">
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
                />
              </div>
              <Button type="submit" className="w-full gradient-accent text-accent-foreground hover:opacity-90" disabled={submitting}>
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
