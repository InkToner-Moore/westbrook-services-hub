import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Globe, 
  User, 
  LogOut, 
  Search,
  ExternalLink,
  Truck,
  Package,
  Settings,
  Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const handleLogout = async () => {
    await logout();
  };

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
  };

  const isDev = import.meta.env.VITE_NODE_ENV === 'development';
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="backdrop-blur-xl bg-white/10 border-b border-white/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link 
                to="/staff/dashboard"
                className="text-blue-200 hover:text-white transition-colors mr-4 group"
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
                Back to Dashboard
              </Link>
              <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-xl shadow-2xl">
                <Globe className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100 drop-shadow-lg">
                  Website Directory
                </h1>
                <p className="text-xs font-medium text-blue-200">Staff Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {isDev && bypassAuth && (
                <div className="text-xs px-2 py-1 bg-orange-500/20 border border-orange-400/50 rounded text-orange-200">
                  DEV MODE
                </div>
              )}
              <div className="flex items-center space-x-2 text-blue-200">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 transition-all duration-300 hover:scale-110"
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
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-2xl">
            Quick Access Directory
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-lg">
            Fast access to commonly used shipping and courier websites
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-blue-200" />
            <Input
              placeholder="Search websites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-blue-200"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={categoryFilter === "all" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("all")}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              All
            </Button>
            <Button
              variant={categoryFilter === "admin" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("admin")}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              Admin
            </Button>
            <Button
              variant={categoryFilter === "shipping" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("shipping")}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              Shipping
            </Button>
            <Button
              variant={categoryFilter === "courier" ? "default" : "ghost"}
              onClick={() => setCategoryFilter("courier")}
              className="bg-white/20 hover:bg-white/30 text-white"
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
              className="backdrop-blur-xl bg-white/15 border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 cursor-pointer group"
              onClick={() => window.open(website.url, '_blank')}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`bg-gradient-to-r ${website.color} p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <website.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    {website.isAdmin && (
                      <Badge className="bg-red-500/20 text-red-300 border-red-400/50 border text-xs">
                        Admin
                      </Badge>
                    )}
                    <ExternalLink className="h-4 w-4 text-blue-200 group-hover:text-white transition-colors" />
                  </div>
                </div>
                <CardTitle className="text-white text-lg drop-shadow-lg group-hover:text-cyan-100 transition-colors">
                  {website.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-blue-200 text-sm mb-3 group-hover:text-blue-100 transition-colors">
                  {website.description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={`${getCategoryBadge(website.category)} border text-xs`}>
                    {website.category}
                  </Badge>
                  <div className="text-xs text-blue-300 font-mono truncate max-w-32">
                    {website.url.replace('https://', '').replace('www.', '')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredWebsites.length === 0 && (
          <div className="text-center py-12">
            <Globe className="h-16 w-16 text-blue-300 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-white mb-2">No websites found</h3>
            <p className="text-blue-200">Try adjusting your search terms or filter</p>
          </div>
        )}

        {/* Quick Access Section */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center drop-shadow-lg">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Button
              onClick={() => window.open('https://eshiponline.purolator.com/', '_blank')}
              className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
            >
              <Shield className="h-5 w-5 mr-2" />
              Purolator Admin
            </Button>
            <Button
              onClick={() => window.open('https://www.fedex.com/shipping/shipEntryAction.do', '_blank')}
              className="h-16 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
            >
              <Shield className="h-5 w-5 mr-2" />
              FedEx Admin
            </Button>
            <Button
              onClick={() => window.open('https://www.clickship.com/', '_blank')}
              className="h-16 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
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