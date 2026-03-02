import { useNavigate } from "react-router-dom";
import { Users, Eye, LogIn, ExternalLink } from "lucide-react";

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
    className="group relative flex flex-col items-center gap-3 xs:gap-4 rounded-lg xs:rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 xs:p-6 sm:p-8 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 hover:bg-white/10 animate-fade-in w-full active:scale-95 xs:active:scale-95"
    style={{ animationDelay: delay }}
  >
    <div className={`flex h-12 xs:h-14 sm:h-16 w-12 xs:w-14 sm:w-16 items-center justify-center rounded-xl xs:rounded-2xl transition-transform duration-300 group-hover:scale-110 ${iconBg || 'gradient-primary'}`}>
      <Icon className="h-6 xs:h-7 sm:h-8 w-6 xs:w-7 sm:w-8 text-white" />
    </div>
    <h3 className="font-display text-base xs:text-lg sm:text-xl font-semibold text-white">{title}</h3>
    <p className="text-xs xs:text-sm sm:text-sm text-white/60 text-center leading-relaxed line-clamp-2 xs:line-clamp-3">{description}</p>
  </button>
);

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full gradient-hero">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-white/2">
        <div className="flex items-center justify-center px-4 xs:px-6 sm:px-8 py-3 xs:py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="EduPhoenix" className="h-8 xs:h-10 sm:h-12 object-contain" />
            <span className="hidden xs:inline text-sm xs:text-base font-semibold text-white">TrackHub</span>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex flex-col items-center justify-center px-4 xs:px-6 sm:px-8 py-6 xs:py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="w-full max-w-4xl">
          {/* Logo Section */}
          <div className="mb-6 xs:mb-8 sm:mb-12 animate-fade-in text-center">
            <div className="mb-4 xs:mb-6 sm:mb-8 flex justify-center">
              <img 
                src="/logo.jpeg" 
                alt="EU Phoenix Solutions" 
                className="h-20 xs:h-24 sm:h-32 object-contain" 
              />
            </div>

            {/* Badge */}
            <div className="mb-3 xs:mb-4 sm:mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 xs:px-4 py-1 xs:py-1.5 text-center">
              <div className="h-1.5 xs:h-2 w-1.5 xs:w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs xs:text-sm font-medium text-red-400">Organization Log System</span>
            </div>

            {/* Main Title */}
            <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-3 xs:mb-4 sm:mb-6">
              EduPhoenix TrackHub
            </h1>

            {/* Subtitle */}
            <p className="mx-auto text-sm xs:text-base sm:text-lg md:text-xl text-white/60 max-w-xs xs:max-w-sm sm:max-w-md md:max-w-lg leading-relaxed">
              Streamlined workspace management, all in one place.
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid gap-3 xs:gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-8 xs:mb-12 sm:mb-16">
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

          {/* Visit Website Button */}
          <div className="flex justify-center mb-8 xs:mb-12 sm:mb-16">
            <a
              href="https://www.eduphoenixsolutions.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 xs:gap-3 px-6 xs:px-8 py-3 xs:py-4 font-medium text-sm xs:text-base text-white overflow-hidden rounded-xl transition-all duration-500 active:scale-95"
            >
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-700" />
              </div>

              {/* Content */}
              <span className="relative z-10 flex items-center gap-2 xs:gap-3">
                <span className="inline-block">Visit Our Website</span>
                <ExternalLink className="h-4 xs:h-5 w-4 xs:w-5 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>

              {/* Pulsing accent dots */}
              <div className="absolute -top-1 -right-1 h-3 xs:h-4 w-3 xs:w-4 rounded-full bg-red-400 opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-500" />
              <div className="absolute -bottom-1 -left-1 h-2 xs:h-3 w-2 xs:h-3 rounded-full bg-yellow-400 opacity-0 group-hover:opacity-100 animate-pulse transition-opacity duration-700" />
              
              {/* Border glow effect */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-white/30 transition-colors duration-500" />
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-white/2 backdrop-blur-md px-4 xs:px-6 sm:px-8 py-4 xs:py-6 sm:py-8 mt-8 xs:mt-12 sm:mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-white/40">
            © 2026 EduPhoenix TrackHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
