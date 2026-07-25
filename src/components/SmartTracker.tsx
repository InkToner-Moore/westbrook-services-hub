import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Package, Loader2, ExternalLink } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import upsLogo from "@/assets/couriers/ups.png";
import fedexLogo from "@/assets/couriers/fedex.png";
import purolatorLogo from "@/assets/couriers/purolator.png";

interface SmartTrackerProps {
  className?: string;
}

const SmartTracker = ({ className = "" }: SmartTrackerProps) => {
  // Package tracking is always enabled since system settings was removed
  const { themeClasses } = useTheme();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [transferringTo, setTransferringTo] = useState<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Package tracking is always available

  const couriers = [
    {
      id: "ups",
      name: "UPS",
      url: "https://www.ups.com/track?tracknum=",
      color: "bg-gradient-to-r from-amber-500 to-amber-800", // UPS brown/orange
      logo: upsLogo
    },
    {
      id: "fedex", 
      name: "FedEx",
      url: "https://www.fedex.com/wtrk/track/?trknbr=",
      color: "bg-gradient-to-r from-purple-600 to-orange-500", // FedEx purple & orange
      logo: fedexLogo
    },
    {
      id: "purolator",
      name: "Purolator", 
      url: "https://www.purolator.com/en/shipping/tracker?pin=",
      color: "bg-gradient-to-r from-blue-600 to-red-600", // Purolator blue & red
      logo: purolatorLogo
    }
  ];

  const handleCourierClick = (courierId: string) => {
    if (transferringTo) return;

    if (!trackingNumber.trim()) {
      setSelectedCourier(courierId);
      toast({
        title: "Missing tracking number",
        description: "Please enter your tracking number first",
        variant: "destructive"
      });
      return;
    }

    const courier = couriers.find(c => c.id === courierId);
    if (!courier) return;

    setSelectedCourier(courierId);
    setTransferringTo(courier.name);

    const trackingUrl = `${courier.url}${encodeURIComponent(trackingNumber.trim())}`;
    timerRef.current = window.setTimeout(() => {
      window.location.href = trackingUrl;
    }, 1100);
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
          Enter your tracking number, then tap your shipping company
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
          {transferringTo ? (
            <div
              role="status"
              className="mb-3 flex items-center justify-center space-x-3 rounded-lg border-2 border-blue-500/40 bg-blue-500/10 px-4 py-3"
            >
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
              <span className={`font-semibold ${themeClasses.text.primary}`}>
                Taking you to {transferringTo} tracking...
              </span>
            </div>
          ) : (
            <label className={`block text-sm font-medium mb-3 ${themeClasses.text.primary}`}>
              Shipping Company - Tap to track
            </label>
          )}
          <div className="grid grid-cols-1 gap-3">
            {couriers.map((courier) => (
              <button
                key={courier.id}
                onClick={() => handleCourierClick(courier.id)}
                disabled={!!transferringTo}
                className={`p-4 rounded-lg border-2 transition-all duration-300 text-left hover:shadow-md ${
                  selectedCourier === courier.id
                    ? `${courier.color} text-white border-transparent shadow-lg`
                    : `${themeClasses.card.secondary} border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500`
                } ${
                  transferringTo && selectedCourier !== courier.id
                    ? "opacity-40"
                    : ""
                } ${
                  transferringTo && selectedCourier === courier.id
                    ? "scale-[1.02]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-20 h-12 rounded-lg flex items-center justify-center p-2 ${
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
                  {transferringTo && selectedCourier === courier.id ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : selectedCourier === courier.id ? (
                    <ExternalLink className="h-6 w-6 text-white" />
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartTracker;