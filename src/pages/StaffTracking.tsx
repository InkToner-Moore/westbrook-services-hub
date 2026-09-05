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
      <div className="mx-auto max-w-3xl">
        <SmartTracker />
      </div>
    </StaffLayout>
  );
};

export default StaffTracking;
