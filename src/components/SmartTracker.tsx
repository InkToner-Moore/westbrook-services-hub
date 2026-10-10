import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Package, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cleanTrackingNumber } from "@/lib/utils";
import upsLogo from "@/assets/couriers/ups.png";
import fedexLogo from "@/assets/couriers/fedex.png";
import fedexDarkLogo from "@/assets/couriers/fedex-dark.png";
import purolatorLogo from "@/assets/couriers/purolator.png";

interface SmartTrackerProps {
  className?: string;
  variant?: "card" | "plain";
  // The card's own titled header. Hidden when a surrounding layout (the staff
  // shell's tool title bar) already names the tool, so it does not read twice.
  showHeader?: boolean;
}

const SmartTracker = ({ className = "", showHeader = true, variant = "card" }: SmartTrackerProps) => {
  const plain = variant === "plain";
  const headerVisible = showHeader && !plain;
  const { themeClasses, isDarkMode } = useTheme();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [transferringTo, setTransferringTo] = useState<string>("");
  const [missingNumber, setMissingNumber] = useState(false);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // The logos are transparent and sit straight on the tile. Each courier has
  // one soft wash in its own logo colours, used solely as the "you picked
  // this one" highlight, light enough that the logo still reads on top.
  const couriers = [
    {
      id: "ups",
      name: "UPS",
      url: "https://www.ups.com/track?tracknum=",
      selected: "border-[#d99a00] bg-[linear-gradient(135deg,rgba(255,181,0,0.34),rgba(120,72,30,0.14))]",
      logo: upsLogo,
      logoDark: upsLogo
    },
    {
      id: "fedex",
      name: "FedEx",
      url: "https://www.fedex.com/wtrk/track/?trknbr=",
      selected: "border-[#7a3fc4] bg-[linear-gradient(135deg,rgba(110,50,190,0.28),rgba(255,102,0,0.24))]",
      logo: fedexLogo,
      // The purple letters vanish on a dark tile, so dark mode gets white ones.
      logoDark: fedexDarkLogo
    },
    {
      id: "purolator",
      name: "Purolator",
      url: "https://www.purolator.com/en/shipping/tracker?pin=",
      selected: "border-[#e0362b] bg-[linear-gradient(135deg,rgba(238,49,36,0.24),rgba(0,82,155,0.24))]",
      logo: purolatorLogo,
      logoDark: purolatorLogo
    }
  ];

  const handleCourierClick = (courierId: string) => {
    if (transferringTo) return;

    // Pasted numbers can contain spaces, commas and surrounding punctuation; strip them for couriers.
    const number = cleanTrackingNumber(trackingNumber);
    if (!number) {
      setMissingNumber(true);
      inputRef.current?.focus();
      return;
    }

    const courier = couriers.find(c => c.id === courierId);
    if (!courier) return;

    setSelectedCourier(courierId);
    setTransferringTo(courier.name);

    const trackingUrl = `${courier.url}${encodeURIComponent(number)}`;
    timerRef.current = window.setTimeout(() => {
      window.location.href = trackingUrl;
    }, 1100);
  };

  return (
    <div className={plain ? className : `rounded-xl border p-5 sm:p-6 ${className} ${themeClasses.card.primary}`}>
      {headerVisible && (
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
      )}

      <div className={`${headerVisible ? "mt-5" : ""} space-y-5`}>
        {/* Tracking Number Input */}
        <div>
          <label htmlFor="tracking-number" className={`mb-1.5 block text-sm font-medium ${plain ? "text-pub-ink" : themeClasses.text.primary}`}>
            Tracking number
          </label>
          <Input
            id="tracking-number"
            ref={inputRef}
            placeholder="e.g. 1Z999AA10123456784"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={trackingNumber}
            onChange={(e) => {
              setTrackingNumber(e.target.value);
              setMissingNumber(false);
            }}
            aria-invalid={missingNumber}
            aria-describedby={missingNumber ? "tracking-number-error" : undefined}
            className={plain ? "pub-field h-14 rounded-xl border-pub-edge bg-pub-counter text-lg md:text-lg font-mono tabular-nums text-pub-ink" : `h-11 font-mono tabular-nums ${themeClasses.input}`}
          />
          {missingNumber && (
            <p id="tracking-number-error" role="alert" className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${plain ? "pub-error" : themeClasses.status.error}`}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Enter the tracking number first, then choose the courier.
            </p>
          )}
        </div>

        {/* Courier Selection */}
        <div>
          {transferringTo ? (
            <div
              role="status"
              className={`mb-3 flex items-center gap-3 rounded-lg border px-4 py-3 ${plain ? "border-pub-edge bg-pub-counter text-pub-ink" : themeClasses.status.info}`}
            >
              <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              <span className="font-medium">
                Taking you to {transferringTo} tracking
              </span>
            </div>
          ) : (
            <p id="tracking-courier-label" className={`mb-1.5 text-sm font-medium ${plain ? "text-pub-ink" : themeClasses.text.primary}`}>
              Courier
            </p>
          )}
          <div role="group" aria-labelledby={transferringTo ? undefined : "tracking-courier-label"} className="grid grid-cols-3 gap-2 sm:gap-3">
            {couriers.map((courier) => {
              const isSelected = selectedCourier === courier.id;
              return (
                <button
                  key={courier.id}
                  type="button"
                  onClick={() => handleCourierClick(courier.id)}
                  disabled={!!transferringTo}
                  aria-label={`Track with ${courier.name}`}
                  className={`${plain ? "pub-courier relative flex min-h-[84px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 transition-colors" : "relative flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"} ${
                    isSelected
                      ? `${courier.selected} ${plain ? "bg-pub-counter" : isDarkMode ? "bg-[#1f232c]" : "bg-[#f1efe9]"}`
                      : plain ? "border-pub-edge bg-pub-counter hover:border-pub-ink" : `${themeClasses.card.secondary}`
                  } ${
                    transferringTo && !isSelected ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex h-8 w-full max-w-[72px] items-center justify-center">
                    <img
                      src={isDarkMode ? courier.logoDark : courier.logo}
                      alt=""
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        // Bundled asset, but hide gracefully if it ever fails; the
                        // name label below still identifies the courier.
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${plain ? "text-pub-ink" : themeClasses.text.primary}`}>
                    {courier.name}
                  </span>
                  {transferringTo && isSelected ? (
                    <Loader2 className={`absolute right-1.5 top-1.5 h-4 w-4 animate-spin ${plain ? "text-pub-ink" : themeClasses.text.primary}`} />
                  ) : isSelected ? (
                    <ExternalLink className={`absolute right-1.5 top-1.5 h-4 w-4 ${plain ? "text-pub-ink" : themeClasses.text.primary}`} />
                  ) : null}
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
