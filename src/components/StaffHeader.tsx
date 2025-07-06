import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

interface StaffHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  backTo?: string;
  backLabel?: string;
}

const StaffHeader = ({ 
  title, 
  subtitle = "Staff Portal", 
  icon: Icon,
  iconColor = "from-blue-400 to-indigo-600",
  backTo = "/staff/dashboard",
  backLabel = "Back to Dashboard"
}: StaffHeaderProps) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, themeClasses } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  const isDev = import.meta.env.VITE_NODE_ENV === 'development';
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  return (
    <header className={`backdrop-blur-xl border-b sticky top-0 z-50 shadow-2xl transition-all duration-500 ${themeClasses.header}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-3">
            <Link 
              to={backTo}
              className={`transition-colors mr-4 group ${themeClasses.link}`}
            >
              <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
              {backLabel}
            </Link>
            {Icon && (
              <div className={`bg-gradient-to-br ${iconColor} p-3 rounded-xl shadow-2xl`}>
                <Icon className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
            )}
            <div>
              <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-500 ${themeClasses.gradient.title}`}>
                {title}
              </h1>
              <p className={`text-xs font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>
                {subtitle}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {isDev && bypassAuth && (
              <div className="text-xs px-2 py-1 bg-orange-500/20 border border-orange-400/50 rounded text-orange-200">
                DEV MODE
              </div>
            )}
            <div className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.secondary}`}>
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            
            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="sm"
              className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 ${themeClasses.button.ghost}`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className={`rounded-full px-4 py-2 transition-all duration-300 hover:scale-110 ${themeClasses.button.ghost}`}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StaffHeader;