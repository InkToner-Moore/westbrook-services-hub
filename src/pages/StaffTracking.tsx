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
    </StaffLayout>
  );
};

export default StaffTracking;