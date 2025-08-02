import { Package } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import SmartTracker from "@/components/SmartTracker";
import StaffLayout from "@/components/StaffLayout";

const StaffTracking = () => {
  const { isDarkMode, themeClasses } = useTheme();

  return (
    <StaffLayout 
      title="Package Tracking"
      icon={Package}
      iconColor="from-blue-400 to-indigo-600"
    >
      <div className="text-center mb-12">
        <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-all duration-500 ${themeClasses.text.primary}`}>
          Smart Package Tracking
        </h2>
        <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${themeClasses.text.secondary}`}>
          Enter any tracking number and we'll automatically detect the courier and open their tracking page
        </p>
      </div>

      {/* Smart Tracker Component */}
      <div className="max-w-5xl mx-auto">
        <SmartTracker />
      </div>

      {/* Help Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <div className={`backdrop-blur-xl border rounded-3xl p-8 shadow-2xl ${themeClasses.card.primary}`}>
          <h3 className={`text-2xl font-bold mb-6 text-center ${themeClasses.text.primary}`}>
            Supported Couriers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 rounded-xl shadow-xl mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <span className="text-white font-bold text-lg">UPS</span>
              </div>
              <h4 className={`font-semibold mb-2 ${themeClasses.text.primary}`}>UPS</h4>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                1Z format, T-prefixed, 9-digit numbers
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl shadow-xl mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <span className="text-white font-bold text-lg">FDX</span>
              </div>
              <h4 className={`font-semibold mb-2 ${themeClasses.text.primary}`}>FedEx</h4>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Express, Ground, SmartPost, Freight
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl shadow-xl mx-auto w-16 h-16 flex items-center justify-center mb-4">
                <span className="text-white font-bold text-lg">PUR</span>
              </div>
              <h4 className={`font-semibold mb-2 ${themeClasses.text.primary}`}>Purolator</h4>
              <p className={`text-sm ${themeClasses.text.secondary}`}>
                Alphanumeric and numeric formats
              </p>
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffTracking;