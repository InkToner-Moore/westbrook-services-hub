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
  Boxes,
  ClipboardList,
  LogOut,
  User,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";

const StaffDashboard = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme, themeClasses } = useTheme();
  const navigate = useNavigate();
  
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

  // All dashboard items with their feature paths
  const allDashboardItems = [
    {
      title: "Package Tracker",
      description: "Same smart tracking system (shared with customers)",
      icon: Package,
      color: "from-blue-500 to-indigo-600",
      route: "/staff/tracking",

      featurePath: "modules.packageTracking.enabled"
    },
    {
      title: "Receipt Generator",
      description: "Create custom receipts for shipping and keys",
      icon: Receipt,
      color: "from-green-500 to-emerald-600",
      route: "/staff/receipts",

      featurePath: "modules.receiptGenerator.enabled"
    },
    {
      title: "Customer Cartridge Manager",
      description: "Track refill status and update completion",
      icon: Printer,
      color: "from-purple-500 to-violet-600",
      route: "/staff/cartridges",

      featurePath: "modules.cartridgeManager.enabled"
    },
    {
      title: "Website Directory",
      description: "Quick access to commonly used websites",
      icon: Globe,
      color: "from-cyan-500 to-blue-600",
      route: "/staff/directory",

      featurePath: "modules.directory.enabled"
    },
    {
      title: "Notes System",
      description: "Internal staff notes and reminders",
      icon: StickyNote,
      color: "from-yellow-500 to-orange-600",
      route: "/staff/notes",

      featurePath: "modules.notes.enabled"
    },
    {
      title: "Inventory",
      description: "Track what's in stock — keys and more",
      icon: Boxes,
      color: "from-amber-500 to-orange-600",
      route: "/staff/inventory",

      featurePath: "modules.inventory.enabled"
    },
    {
      title: "Customer Requests",
      description: "Items customers are waiting to hear back on",
      icon: ClipboardList,
      color: "from-rose-500 to-pink-600",
      route: "/staff/requests",

      featurePath: "modules.customerRequests.enabled"
    },
  ];

  // All remaining dashboard items are available
  const dashboardItems = allDashboardItems;

  return (
    <div className={`min-h-screen transition-all duration-500 ${themeClasses.background}`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse transition-all duration-500 ${themeClasses.backgroundFloating.purple}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000 transition-all duration-500 ${themeClasses.backgroundFloating.blue}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500 transition-all duration-500 ${themeClasses.backgroundFloating.indigo}`}></div>
      </div>

      {/* Header */}
      <header className={`backdrop-blur-xl border-b sticky top-0 z-50 shadow-2xl transition-all duration-500 ${themeClasses.header}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl">
                <Printer className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-500 ${themeClasses.gradient.title}`}>
                  Staff Portal
                </h1>
                <p className={`text-xs font-medium transition-all duration-500 ${themeClasses.text.secondary}`}>Ink, Toner, & Moore</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 transition-all duration-500 ${themeClasses.text.secondary}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              
              {/* Theme Toggle */}
              <Button
                onClick={toggleTheme}
                variant="ghost"
                size="sm"
                className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 border ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className={`rounded-lg px-4 py-2 transition-all duration-300 hover:scale-105 border ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
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
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-all duration-500 ${themeClasses.text.primary}`}>
            Welcome to the Staff Dashboard
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${themeClasses.text.secondary}`}>
            Access all your business tools and manage operations efficiently
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboardItems.map((item, index) => (
            <Card
              key={index}
              className={`shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 cursor-pointer group border ${
                themeClasses.card.primary
              } ${
                themeClasses.interactive.hover
              }`}
              onClick={() => navigate(item.route)}
            >
              <CardHeader className="pb-4">
                <div className="mb-2">
                  <div className={`bg-gradient-to-r ${item.color} p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300 w-fit`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <CardTitle className={`text-lg drop-shadow-lg transition-colors ${themeClasses.text.primary} group-hover:${themeClasses.text.accent}`}>
                  {item.title}
                </CardTitle>
                <CardDescription className={`text-sm transition-all duration-500 ${themeClasses.text.secondary}`}>
                  {item.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

      </main>
    </div>
  );
};

export default StaffDashboard;