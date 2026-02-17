import { useNavigate } from "react-router-dom";
import { Users, Eye, LogIn } from "lucide-react";

const RoleCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  delay,
  iconBg,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  delay: string;
  iconBg?: string;
}) => (
  <button
    onClick={onClick}
    className="group relative flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 hover:bg-white/10 animate-fade-in w-full"
    style={{ animationDelay: delay }}
  >
    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 ${iconBg || 'gradient-primary'}`}>
      <Icon className="h-8 w-8 text-white" />
    </div>
    <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
    <p className="text-sm text-white/60 text-center leading-relaxed">{description}</p>
  </button>
);

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-hero px-4">
      <div className="w-full max-w-4xl text-center">
        <div className="mb-12 animate-fade-in">
          {/* EU Phoenix Solutions Logo */}
          <div className="mb-8 flex justify-center">
            <img src="/logo.jpeg" alt="EU Phoenix Solutions" className="h-32 object-contain" />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-400">Organization Log System</span>
          </div>
          <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
            EduPhoenix TrackHub
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-white/50 text-xl">
            Streamlined workspace management, all in one place.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <RoleCard
            icon={Users}
            title="I am an Intern"
            description="Check in for your daily internship session"
            onClick={() => navigate("/intern")}
            delay="0.1s"
            iconBg="gradient-primary"
          />
          <RoleCard
            icon={Eye}
            title="I am a Visitor"
            description="Log your visit to the organization"
            onClick={() => navigate("/visitor")}
            delay="0.2s"
            iconBg="gradient-accent"
          />
          <RoleCard
            icon={LogIn}
            title="Login"
            description="Sign in as admin or employee"
            onClick={() => navigate("/login")}
            delay="0.3s"
            iconBg="bg-white/15"
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
