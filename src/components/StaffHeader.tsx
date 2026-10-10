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
  iconColor = "text-pub-ink",
  backTo = "/staff/dashboard",
  backLabel = "Back to Dashboard"
}: StaffHeaderProps) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, themeClasses } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className={`border-b sticky top-0 z-50 transition-colors ${themeClasses.header}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-3">
            <Link 
              to={backTo}
              className={`transition-colors mr-4 group ${themeClasses.link}`}
            >
              <ArrowLeft className="h-6 w-6 transition-transform inline mr-2" />
              {backLabel}
            </Link>
            {Icon && (
              <div className="flex items-center justify-center p-3 rounded-xl bg-pub-sunk border-pub-edge">
                <Icon className={`h-8 w-8 ${iconColor}`} />
              </div>
            )}
            <div>
              <h1 className="font-display font-semibold text-pub-ink text-xl lg:text-2xl transition-colors">
                {title}
              </h1>
              <p className="text-xs font-medium transition-colors text-pub-muted">
                {subtitle}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 transition-colors text-pub-muted">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{user?.email}</span>
            </div>

            {/* Theme Toggle */}
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="sm"
              className={`p-2 rounded-lg transition-colors border ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className={`rounded-lg px-4 py-2 transition-colors border ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
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