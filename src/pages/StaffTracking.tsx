import { Package } from "lucide-react";
import SmartTracker from "@/components/SmartTracker";
import StaffLayout from "@/components/StaffLayout";

const StaffTracking = () => {
  return (
    <StaffLayout
      title="Package Tracking"
      subtitle="Enter the tracking number, then choose the courier"
      tool="tracking"
      icon={Package}
      iconColor="text-pub-ink"
    >
      {/* The shell's tool title bar already names Tracking (blue hue), so the
          tracker card drops its own header here to avoid a doubled title. */}
      <SmartTracker showHeader={false} />
    </StaffLayout>
  );
};

export default StaffTracking;
