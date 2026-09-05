import { Package } from "lucide-react";
import SmartTracker from "@/components/SmartTracker";
import StaffLayout from "@/components/StaffLayout";

const StaffTracking = () => {
  return (
    <StaffLayout
      title="Package Tracking"
      subtitle="Enter a tracking number and we'll detect the courier and open their tracking page"
      icon={Package}
      iconColor="text-blue-600 dark:text-blue-400"
    >
      {/* The shell's tool title bar already names Tracking (blue hue), so the
          tracker card drops its own header here to avoid a doubled title. */}
      <div className="mx-auto max-w-2xl">
        <SmartTracker showHeader={false} />
      </div>
    </StaffLayout>
  );
};

export default StaffTracking;
