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
  const { themeClasses, isDarkMode } = useTheme();
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

  // Flat brand fills only (no gradients as decoration) - one colour per
  // courier, used solely as the "you picked this one" highlight.
  const couriers = [
    {
      id: "ups",
      name: "UPS",
      url: "https://www.ups.com/track?tracknum=",
      color: "bg-amber-800",
      logo: upsLogo
    },
    {
      id: "fedex",
      name: "FedEx",
      url: "https://www.fedex.com/wtrk/track/?trknbr=",
      color: "bg-violet-700",
      logo: fedexLogo
    },
    {
      id: "purolator",
      name: "Purolator",
      url: "https://www.purolator.com/en/shipping/tracker?pin=",
      color: "bg-blue-700",
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
    <div className={`rounded-xl border p-5 sm:p-6 ${className} ${themeClasses.card.primary}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDarkMode ? "bg-blue-950/60" : "bg-blue-50"}`}>
          <Package className={`h-5 w-5 ${isDarkMode ? "text-blue-300" : "text-blue-700"}`} />
        </span>
        <div>
          <h2 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
            Track a parcel
          </h2>
          <p className={`text-[13px] ${themeClasses.text.secondary}`}>
            Enter the tracking number, then choose the courier
          </p>
        </div>
      </div>

      <div className="mt-5 max-w-md space-y-5">
        {/* Tracking Number Input */}
        <div>
          <label htmlFor="tracking-number" className={`mb-1.5 block text-sm font-medium ${themeClasses.text.primary}`}>
            Tracking number
          </label>
          <Input
            id="tracking-number"
            placeholder="e.g. 1Z999AA10123456784"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className={`h-11 font-mono tabular-nums ${themeClasses.input}`}
          />
        </div>

        {/* Courier Selection */}
        <div>
          {transferringTo ? (
            <div
              role="status"
              className={`mb-3 flex items-center gap-3 rounded-lg border px-4 py-3 ${themeClasses.status.info}`}
            >
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              <span className="font-medium">
                Taking you to {transferringTo} tracking
              </span>
            </div>
          ) : (
            <label className={`mb-3 block text-sm font-medium ${themeClasses.text.primary}`}>
              Shipping company, tap to track
            </label>
          )}
          <div className="grid grid-cols-1 gap-3">
            {couriers.map((courier) => {
              const isSelected = selectedCourier === courier.id;
              return (
                <button
                  key={courier.id}
                  onClick={() => handleCourierClick(courier.id)}
                  disabled={!!transferringTo}
                  className={`min-h-[44px] rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? `${courier.color} border-transparent text-white`
                      : `${themeClasses.card.secondary}`
                  } ${
                    transferringTo && !isSelected ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-20 items-center justify-center rounded-lg p-2 ${
                        isSelected ? "bg-white/20" : "bg-white dark:bg-[#f1efe9]"
                      }`}>
                        <img
                          src={courier.logo}
                          alt={`${courier.name} logo`}
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            // Fallback to text if logo fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling!.textContent = courier.name;
                          }}
                        />
                        <span className="hidden text-xs font-bold text-gray-700"></span>
                      </div>
                      <div className={`text-lg font-semibold ${isSelected ? "text-white" : themeClasses.text.primary}`}>
                        {courier.name}
                      </div>
                    </div>
                    {transferringTo && isSelected ? (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : isSelected ? (
                      <ExternalLink className="h-6 w-6 text-white" />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartTracker;
