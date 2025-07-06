import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Printer, 
  Package, 
  Key, 
  Receipt, 
  Globe, 
  StickyNote, 
  Megaphone, 
  LogOut, 
  User,
  BarChart3,
  Wrench,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const isDev = import.meta.env.VITE_NODE_ENV === 'development';
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of the staff portal",
      });
      navigate("/");
    }
  };

  const dashboardItems = [
    {
      title: "Package Tracker",
      description: "Same smart tracking system (shared with customers)",
      icon: Package,
      color: "from-blue-500 to-indigo-600",
      route: "/staff/tracking",
      status: "Available"
    },
    {
      title: "Receipt Generator",
      description: "Create custom receipts for shipping and keys",
      icon: Receipt,
      color: "from-green-500 to-emerald-600",
      route: "/staff/receipts",
      status: "Available"
    },
    {
      title: "Customer Cartridge Manager",
      description: "Track refill status and update completion",
      icon: Printer,
      color: "from-purple-500 to-violet-600",
      route: "/staff/cartridges",
      status: "Available"
    },
    {
      title: "Inventory System",
      description: "Manage keys, cartridges, stock levels and prices",
      icon: BarChart3,
      color: "from-orange-500 to-red-600",
      route: "/staff/inventory",
      status: "Available"
    },
    {
      title: "Website Directory",
      description: "Quick access to commonly used websites",
      icon: Globe,
      color: "from-cyan-500 to-blue-600",
      route: "/staff/directory",
      status: "Available"
    },
    {
      title: "Notes System",
      description: "Internal staff notes and reminders",
      icon: StickyNote,
      color: "from-yellow-500 to-orange-600",
      route: "/staff/notes",
      status: "Available"
    },
    {
      title: "Blog & Announcements",
      description: "Manage customer-facing updates",
      icon: Megaphone,
      color: "from-pink-500 to-rose-600",
      route: "/staff/blog",
      status: "Available"
    },
    {
      title: "System Settings",
      description: "Configure system preferences",
      icon: Wrench,
      color: "from-gray-500 to-slate-600",
      route: "/staff/settings",
      status: "Available"
    }
  ];

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-200'
    }`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse transition-all duration-500 ${
          isDarkMode ? 'bg-purple-500' : 'bg-purple-300'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000 transition-all duration-500 ${
          isDarkMode ? 'bg-blue-500' : 'bg-blue-300'
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500 transition-all duration-500 ${
          isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300'
        }`}></div>
      </div>

      {/* Header */}
      <header className={`backdrop-blur-xl border-b sticky top-0 z-50 shadow-2xl transition-all duration-500 ${
        isDarkMode 
          ? 'bg-white/10 border-white/20' 
          : 'bg-white/50 border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl">
                <Printer className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-500 ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-white to-blue-100' 
                    : 'bg-gradient-to-r from-gray-800 to-blue-600'
                }`}>
                  Staff Portal
                </h1>
                <p className={`text-xs font-medium transition-all duration-500 ${
                  isDarkMode ? 'text-blue-200' : 'text-blue-600'
                }`}>Ink, Toner, & Moore</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 transition-all duration-500 ${
                isDarkMode ? 'text-blue-200' : 'text-blue-600'
              }`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              
              {/* Theme Toggle */}
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="ghost"
                size="sm"
                className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : 'bg-gray-200/50 hover:bg-gray-200/70 text-gray-700'
                }`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className={`rounded-full px-4 py-2 transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : 'bg-gray-200/50 hover:bg-gray-200/70 text-gray-700'
                }`}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-all duration-500 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Welcome to the Staff Dashboard
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${
            isDarkMode ? 'text-blue-100' : 'text-gray-600'
          }`}>
            Access all your business tools and manage operations efficiently
          </p>
          {isDev && bypassAuth && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-orange-500/20 border border-orange-400/50 rounded-full text-orange-200 text-sm">
              🚧 Development Mode - Authentication Bypassed
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboardItems.map((item, index) => (
            <Card
              key={index}
              className={`backdrop-blur-xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 cursor-pointer group ${
                isDarkMode 
                  ? 'bg-white/15 border-white/30' 
                  : 'bg-white/30 border-gray-300/50'
              } ${
                item.status === 'Coming Soon' ? 'opacity-75' : ''
              }`}
              onClick={() => {
                if (item.status === 'Available') {
                  navigate(item.route);
                } else {
                  toast({
                    title: "Coming Soon",
                    description: `${item.title} will be available in a future update`,
                  });
                }
              }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`bg-gradient-to-r ${item.color} p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    item.status === 'Available' 
                      ? 'bg-green-500/20 text-green-300 border border-green-400/50' 
                      : 'bg-orange-500/20 text-orange-300 border border-orange-400/50'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <CardTitle className={`text-lg drop-shadow-lg transition-colors ${
                  isDarkMode 
                    ? 'text-white group-hover:text-blue-100' 
                    : 'text-gray-800 group-hover:text-blue-600'
                }`}>
                  {item.title}
                </CardTitle>
                <CardDescription className={`text-sm transition-all duration-500 ${
                  isDarkMode ? 'text-blue-200' : 'text-gray-600'
                }`}>
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-16">
          <h3 className={`text-2xl font-bold mb-8 text-center drop-shadow-lg transition-all duration-500 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button
              onClick={() => navigate("/")}
              className={`h-16 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 border ${
                isDarkMode ? 'border-white/30' : 'border-gray-300/50'
              }`}
            >
              View Public Site
            </Button>
            <Button
              onClick={() => navigate("/staff/tracking")}
              className={`h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 border ${
                isDarkMode ? 'border-white/30' : 'border-gray-300/50'
              }`}
            >
              Quick Package Track
            </Button>
            <Button
              onClick={() => navigate("/staff/receipts")}
              className={`h-16 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 border ${
                isDarkMode ? 'border-white/30' : 'border-gray-300/50'
              }`}
            >
              Generate Receipt
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffDashboard;