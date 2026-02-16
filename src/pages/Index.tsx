import { useNavigate } from "react-router-dom";
import { Users, Eye, ShieldCheck } from "lucide-react";

const RoleCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  delay: string;
}) => (
  <button
    onClick={onClick}
    className="group relative flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-fade-in w-full"
    style={{ animationDelay: delay }}
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary transition-transform duration-300 group-hover:scale-110">
      <Icon className="h-8 w-8 text-primary-foreground" />
    </div>
    <h3 className="font-display text-xl font-semibold text-card-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground text-center leading-relaxed">{description}</p>
  </button>
);

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-hero px-4">
      <div className="w-full max-w-4xl text-center">
        <div className="mb-12 animate-fade-in">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Organization Log System</span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl md:text-6xl">
            Internship Log
            <span className="block text-primary">Management</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground/80 text-lg">
            Streamlined check-in system for interns and visitors. Track attendance effortlessly.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <RoleCard
            icon={Users}
            title="I am an Intern"
            description="Check in for your daily internship session"
            onClick={() => navigate("/intern")}
            delay="0.1s"
          />
          <RoleCard
            icon={Eye}
            title="I am a Visitor"
            description="Log your visit to the organization"
            onClick={() => navigate("/visitor")}
            delay="0.2s"
          />
          <RoleCard
            icon={ShieldCheck}
            title="Admin Login"
            description="Access the management dashboard"
            onClick={() => navigate("/admin/login")}
            delay="0.3s"
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
