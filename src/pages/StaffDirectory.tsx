import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Search,
  ExternalLink,
  Truck,
  Package,
  Settings,
  Shield,
  ArrowLeft,
  User,
  LogOut
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import StaffLayout from "@/components/StaffLayout";
import ThemeToggleButton from "@/components/ThemeToggleButton";

interface WebsiteLink {
  id: string;
  name: string;
  description: string;
  url: string;
  category: "courier" | "admin" | "shipping";
  icon: React.ElementType;
  color: string;
  isAdmin?: boolean;
}

const StaffDirectory = () => {
  const { user, logout } = useAuth();
  const { themeClasses, isDarkMode } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const websites: WebsiteLink[] = [
    {
      id: "purolator-admin",
      name: "Purolator Admin",
      description: "Business account management and shipping tools",
      url: "https://eshiponline.purolator.com/",
      category: "admin",
      icon: Shield,
      color: "from-blue-500 to-blue-600",
      isAdmin: true
    },
    {
      id: "fedex-admin",
      name: "FedEx Admin",
      description: "FedEx Ship Manager and account tools",
      url: "https://www.fedex.com/shipping/shipEntryAction.do",
      category: "admin",
      icon: Shield,
      color: "from-purple-500 to-purple-600",
      isAdmin: true
    },
    {
      id: "clickship",
      name: "ClickShip",
      description: "Multi-carrier shipping platform",
      url: "https://www.clickship.com/",
      category: "shipping",
      icon: Package,
      color: "from-green-500 to-green-600"
    },
    {
      id: "ups",
      name: "UPS",
      description: "United Parcel Service shipping and tracking",
      url: "https://www.ups.com/",
      category: "courier",
      icon: Truck,
      color: "from-yellow-600 to-amber-600"
    },
    {
      id: "fedex",
      name: "FedEx",
      description: "FedEx shipping and tracking services",
      url: "https://www.fedex.com/",
      category: "courier",
      icon: Truck,
      color: "from-purple-500 to-purple-600"
    },
    {
      id: "purolator",
      name: "Purolator",
      description: "Purolator shipping and tracking",
      url: "https://www.purolator.com/",
      category: "courier",
      icon: Truck,
      color: "from-blue-500 to-blue-600"
    }
  ];

  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         website.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || website.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryBadge = (category: string) => {
    if (isDarkMode) {
      switch (category) {
        case "admin":
          return "bg-red-500/20 text-red-300 border-red-400/50";
        case "shipping":
          return "bg-green-500/20 text-green-300 border-green-400/50";
        case "courier":
          return "bg-blue-500/20 text-blue-300 border-blue-400/50";
        default:
          return "bg-gray-500/20 text-gray-300 border-gray-400/50";
      }
    }
    switch (category) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-400";
      case "shipping":
        return "bg-green-100 text-green-800 border-green-400";
      case "courier":
        return "bg-blue-100 text-blue-800 border-blue-400";
      default:
        return "bg-stone-200 text-stone-700 border-stone-400";
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses.background}`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse transition-all duration-300 ${themeClasses.backgroundFloating.purple}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000 transition-all duration-300 ${themeClasses.backgroundFloating.blue}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500 transition-all duration-300 ${themeClasses.backgroundFloating.indigo}`}></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 shadow-2xl transition-colors duration-300 ${themeClasses.header}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link 
                to="/staff/dashboard"
                className={`transition-colors mr-4 group ${themeClasses.link}`}
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
                Back to Dashboard
              </Link>
              <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-xl shadow-2xl">
                <Globe className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-300 ${themeClasses.gradient.title}`}>
                  Website Directory
                </h1>
                <p className={`text-xs font-medium transition-colors duration-300 ${themeClasses.text.secondary}`}>Staff Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <ThemeToggleButton />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-colors duration-300 ${themeClasses.text.primary}`}>
            Quick Access Directory
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-colors duration-300 ${themeClasses.text.secondary}`}>
            Fast access to commonly used shipping and courier websites
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${themeClasses.text.muted}`} />
            <Input
              placeholder="Search websites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 transition-all duration-300 ${themeClasses.input}`}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={categoryFilter === "all" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("all")}
              className={`transition-all duration-300 ${categoryFilter === "all" ? themeClasses.button.primary : themeClasses.button.ghost}`}
            >
              All
            </Button>
            <Button
              variant={categoryFilter === "admin" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("admin")}
              className={`transition-all duration-300 ${categoryFilter === "admin" ? themeClasses.button.primary : themeClasses.button.ghost}`}
            >
              Admin
            </Button>
            <Button
              variant={categoryFilter === "shipping" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("shipping")}
              className={`transition-all duration-300 ${categoryFilter === "shipping" ? themeClasses.button.primary : themeClasses.button.ghost}`}
            >
              Shipping
            </Button>
            <Button
              variant={categoryFilter === "courier" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("courier")}
              className={`transition-all duration-300 ${categoryFilter === "courier" ? themeClasses.button.primary : themeClasses.button.ghost}`}
            >
              Courier
            </Button>
          </div>
        </div>

        {/* Websites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWebsites.map((website) => (
            <Card
              key={website.id}
              className={`shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer group ${themeClasses.card.primary}`}
              onClick={() => window.open(website.url, '_blank')}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`bg-gradient-to-r ${website.color} p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <website.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    {website.isAdmin && (
                      <Badge variant="outline" className={`${getCategoryBadge("admin")} border text-xs`}>
                        Admin
                      </Badge>
                    )}
                    <ExternalLink className={`h-4 w-4 group-hover:text-white transition-colors duration-300 ${themeClasses.text.secondary}`} />
                  </div>
                </div>
                <CardTitle className={`text-lg drop-shadow-lg transition-colors duration-300 ${themeClasses.text.primary} group-hover:${themeClasses.link}`}>
                  {website.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className={`text-sm mb-3 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                  {website.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={`${getCategoryBadge(website.category)} border text-xs capitalize`}>
                    {website.category}
                  </Badge>
                  <div className={`text-xs font-mono truncate max-w-32 transition-colors duration-300 ${themeClasses.text.muted}`}>
                    {website.url.replace('https://', '').replace('www.', '')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredWebsites.length === 0 && (
          <div className="text-center py-12">
            <Globe className={`h-16 w-16 mx-auto mb-4 opacity-50 transition-colors duration-300 ${themeClasses.text.muted}`} />
            <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${themeClasses.text.primary}`}>No websites found</h3>
            <p className={`transition-colors duration-300 ${themeClasses.text.secondary}`}>Try adjusting your search terms or filter</p>
          </div>
        )}

        {/* Quick Access Section */}
        <div className="mt-16">
          <h3 className={`text-2xl font-bold mb-8 text-center drop-shadow-lg transition-colors duration-300 ${themeClasses.text.primary}`}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button
              onClick={() => window.open('https://eshiponline.purolator.com/', '_blank')}
              className={`h-16 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
            >
              <Shield className="h-5 w-5 mr-2" />
              Purolator Admin
            </Button>
            <Button
              onClick={() => window.open('https://www.fedex.com/shipping/shipEntryAction.do', '_blank')}
              className={`h-16 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.secondary}`}
            >
              <Shield className="h-5 w-5 mr-2" />
              FedEx Admin
            </Button>
            <Button
              onClick={() => window.open('https://www.clickship.com/', '_blank')}
              className={`h-16 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.success}`}
            >
              <Package className="h-5 w-5 mr-2" />
              ClickShip
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffDirectory;