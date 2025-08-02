import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Truck, CheckCircle } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";

interface SmartTrackerProps {
  className?: string;
}

const SmartTracker = ({ className = "" }: SmartTrackerProps) => {
  const { isFeatureEnabled } = useSystemSettings();
  const { themeClasses } = useTheme();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedCourier, setSelectedCourier] = useState<string>("");

  // If package tracking is disabled, don't render the component
  if (!isFeatureEnabled('modules.packageTracking.enabled')) {
    return null;
  }

  const couriers = [
    {
      id: "ups",
      name: "UPS",
      url: "https://www.ups.com/track?tracknum=",
      color: "bg-gradient-to-r from-amber-500 to-amber-800", // UPS brown/orange
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/United_Parcel_Service_logo_2014.svg/859px-United_Parcel_Service_logo_2014.svg.png"
    },
    {
      id: "fedex", 
      name: "FedEx",
      url: "https://www.fedex.com/wtrk/track/?trknbr=",
      color: "bg-gradient-to-r from-purple-600 to-orange-500", // FedEx purple & orange
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/FedEx_Express.svg/1280px-FedEx_Express.svg.png"
    },
    {
      id: "purolator",
      name: "Purolator", 
      url: "https://www.purolator.com/en/shipping/tracker?pin=",
      color: "bg-gradient-to-r from-blue-600 to-red-600", // Purolator blue & red
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Purolator_Courier_Logo_2006.svg/1280px-Purolator_Courier_Logo_2006.svg.png"
    }
  ];

  const handleTrackPackage = () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Missing tracking number",
        description: "Please enter your tracking number",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCourier) {
      toast({
        title: "Select courier",
        description: "Please choose your shipping company",
        variant: "destructive"
      });
      return;
    }

    const courier = couriers.find(c => c.id === selectedCourier);
    if (courier) {
      const trackingUrl = `${courier.url}${trackingNumber}`;
      window.open(trackingUrl, '_blank');
      toast({
        title: "Tracking opened",
        description: `Opened ${courier.name} tracking in new tab`,
      });
    }
  };

  return (
    <div className={`rounded-lg shadow-lg p-6 transition-all duration-200 ${className} ${themeClasses.card.primary}`}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h3 className={`text-2xl font-bold ${themeClasses.text.primary}`}>
            Package Tracker
          </h3>
        </div>
        <p className={`${themeClasses.text.secondary}`}>
          Enter your tracking number and select your shipping company
        </p>
      </div>
      
      <div className="max-w-md mx-auto space-y-6">
        {/* Tracking Number Input */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${themeClasses.text.primary}`}>
            Tracking Number
          </label>
          <Input
            placeholder="Enter your tracking number..."
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className={`h-12 text-center transition-all duration-200 ${themeClasses.input}`}
          />
        </div>

        {/* Courier Selection */}
        <div>
          <label className={`block text-sm font-medium mb-3 ${themeClasses.text.primary}`}>
            Shipping Company - Choose one
          </label>
          <div className="grid grid-cols-1 gap-3">
            {couriers.map((courier) => (
              <button
                key={courier.id}
                onClick={() => setSelectedCourier(courier.id)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md ${
                  selectedCourier === courier.id
                    ? `${courier.color} text-white border-transparent shadow-lg`
                    : `${themeClasses.card.secondary} border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-18 h-10 rounded-lg flex items-center justify-center p-2 ${
                      selectedCourier === courier.id 
                        ? 'bg-white/20' 
                        : 'bg-white dark:bg-gray-100'
                    }`}>
                      <img 
                        src={courier.logo} 
                        alt={`${courier.name} logo`}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          // Fallback to text if logo fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling!.textContent = courier.name;
                        }}
                      />
                      <span className="hidden text-xs font-bold text-gray-700"></span>
                    </div>
                    <div className={`font-bold text-lg ${
                      selectedCourier === courier.id 
                        ? 'text-white' 
                        : themeClasses.text.primary
                    }`}>
                      {courier.name}
                    </div>
                  </div>
                  {selectedCourier === courier.id && (
                    <CheckCircle className="h-6 w-6 text-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Track Button */}
        <Button
          onClick={handleTrackPackage}
          className={`w-full h-12 font-semibold transition-all duration-200 ${themeClasses.button.primary}`}
          disabled={!trackingNumber.trim() || !selectedCourier}
        >
          Track My Package
        </Button>
      </div>
    </div>
  );
};

export default SmartTracker;