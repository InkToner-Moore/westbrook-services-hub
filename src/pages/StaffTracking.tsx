import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import SmartTracker from "@/components/SmartTracker";

const StaffTracking = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

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
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl">
                <Printer className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100 drop-shadow-lg">
                  Package Tracking
                </h1>
                <p className="text-xs font-medium text-blue-200">Staff Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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
            Smart Package Tracking
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-lg">
            Enter any tracking number and we'll automatically detect the courier and open their tracking page
          </p>
        </div>

        {/* Smart Tracker Component */}
        <div className="max-w-5xl mx-auto">
          <SmartTracker isDarkMode={true} />
        </div>

        {/* Help Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="backdrop-blur-xl bg-white/15 border-white/30 border rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              Supported Couriers
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 rounded-xl shadow-xl mx-auto w-16 h-16 flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-lg">UPS</span>
                </div>
                <h4 className="text-white font-semibold mb-2">UPS</h4>
                <p className="text-blue-200 text-sm">
                  1Z format, T-prefixed, 9-digit numbers
                </p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl shadow-xl mx-auto w-16 h-16 flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-lg">FDX</span>
                </div>
                <h4 className="text-white font-semibold mb-2">FedEx</h4>
                <p className="text-blue-200 text-sm">
                  Express, Ground, SmartPost, Freight
                </p>
              </div>
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-xl mx-auto w-16 h-16 flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-lg">PUR</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Purolator</h4>
                <p className="text-blue-200 text-sm">
                  Alphanumeric and numeric formats
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StaffTracking;