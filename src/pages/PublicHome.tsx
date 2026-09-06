import { useState } from "react";
import { Phone, MapPin, ExternalLink, Clock, Printer, Key, Package, Sun, Moon, Search, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/useTheme";
import SmartTracker from "@/components/SmartTracker";
import { Link } from "react-router-dom";
import { queryCollection } from "@/lib/firestore";
import storeMap from "@/assets/store-map.png";
import {
  ORDER_STATUS_COLLECTION,
  OrderStatusDoc,
  normalizeLastName,
} from "@/lib/orderStatus";

const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=Westbrook+Mall+Calgary";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  ready: "Ready for Pickup",
  picked_up: "Picked Up",
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
  ready: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-200 dark:border-green-800",
  picked_up: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600",
};

const PublicHome = () => {
  const { isDarkMode, toggleTheme, themeClasses } = useTheme();

  // The wordmark and "Check a refill status" icon use the brand ink colour
  // (indigo) directly, same as AI Mode elsewhere in the app - it is not a
  // themeClasses key, just the one spot outside staff chrome that reaches for it.
  const ink = isDarkMode ? "text-indigo-300" : "text-indigo-700";
  const inkBg = isDarkMode ? "bg-indigo-900/40" : "bg-indigo-50";
  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

  // Refill status checker state. Customers rarely hang on to the order ID, so
  // they look themselves up by last name instead — which can match more than
  // one refill, hence a list of results rather than a single status.
  const [refillLastName, setRefillLastName] = useState("");
  const [refillResults, setRefillResults] = useState<OrderStatusDoc[] | null>(null);
  const [refillError, setRefillError] = useState<string | null>(null);
  const [refillLoading, setRefillLoading] = useState(false);

  const checkRefillStatus = async () => {
    const lastName = normalizeLastName(refillLastName);
    if (!lastName) {
      setRefillError("Please enter your last name.");
      setRefillResults(null);
      return;
    }

    setRefillLoading(true);
    setRefillError(null);
    setRefillResults(null);

    try {
      const matches = await queryCollection<OrderStatusDoc>(
        ORDER_STATUS_COLLECTION,
        'customerLastName',
        lastName
      );

      if (matches.length > 0) {
        setRefillResults(matches);
      } else {
        setRefillError("No refills found under that last name. Please give us a call and we'll look it up.");
      }
    } catch (error) {
      console.error('Failed to check refill status:', error);
      setRefillError("Unable to check status right now. Please try again later.");
    } finally {
      setRefillLoading(false);
    }
  };

  const businessHours = [
    { days: "Monday & Tuesday", hours: "10 AM - 7 PM" },
    { days: "Wednesday - Friday", hours: "10 AM - 9 PM" },
    { days: "Saturday", hours: "10 AM - 6 PM" },
    { days: "Sunday", hours: "11 AM - 5 PM" }
  ];

  const services = [
    {
      icon: Printer,
      title: "Ink & toner cartridges",
      description: "Compatible and brand-name cartridges for all major printer brands"
    },
    {
      icon: Package,
      title: "Ink jet refills",
      description: "Professional refill services - call or visit to verify cartridge compatibility"
    },
    {
      icon: Key,
      title: "Key cutting",
      description: "House, mailbox, and automotive key cutting - call or visit to verify availability"
    },
    {
      icon: Package,
      title: "Shipping",
      description: "UPS, FedEx, Purolator authorized centre"
    }
  ];

  const additionalServices = [
    "Printing, faxing, scanning",
    "Photocopying",
    "Card lamination",
    "Cartridge recycling"
  ];

  return (
    <div className={`min-h-screen ${themeClasses.background}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-xl ${themeClasses.header}`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${inkBg}`}>
                <Printer className={`h-5 w-5 ${ink}`} />
              </span>
              <div className="min-w-0">
                <p className={`truncate text-base font-semibold leading-tight sm:text-lg ${themeClasses.text.primary}`}>
                  Ink, Toner &amp; Moore
                </p>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block truncate rounded-sm text-xs hover:underline sm:text-sm ${themeClasses.text.secondary} ${focusRing}`}
                >
                  Westbrook Mall, Calgary
                </a>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href="tel:4036862835"
                className={`flex h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium sm:px-4 ${themeClasses.button.primary} ${focusRing}`}
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">(403) 686-2835</span>
              </a>

              <Button
                onClick={toggleTheme}
                variant="ghost"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={`h-11 w-11 rounded-lg border p-0 ${themeClasses.button.ghost} ${focusRing}`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <Link
                to="/staff"
                className={`hidden h-11 items-center rounded-lg border px-4 text-sm font-medium sm:flex ${themeClasses.button.secondary} ${focusRing}`}
              >
                Staff login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-6 sm:py-12">
        {/* Hero: what we do and how to reach us, plain, not a marketing headline */}
        <section>
          <h1 className={`max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl ${themeClasses.text.primary}`}>
            Printing, ink and toner, keys, and shipping.
          </h1>
          <p className={`mt-2 max-w-xl text-[15px] leading-relaxed sm:text-lg ${themeClasses.text.secondary}`}>
            Your neighbourhood counter inside Westbrook Mall. Drop by, call, or use the tools below.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <a
              href="tel:4036862835"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium ${themeClasses.card.secondary} ${themeClasses.text.primary} ${focusRing}`}
            >
              <Phone className="h-4 w-4" />
              (403) 686-2835
            </a>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium ${themeClasses.card.secondary} ${themeClasses.text.primary} ${focusRing}`}
            >
              <MapPin className="h-4 w-4" />
              Westbrook Mall, Calgary
            </a>
            <span
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium ${themeClasses.card.secondary} ${themeClasses.text.secondary}`}
            >
              <Clock className="h-4 w-4" />
              Open 7 days a week
            </span>
          </div>
        </section>

        {/* The two jobs a customer came here to do, ahead of anything else */}
        <section aria-label="Self-serve tools" className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          <SmartTracker className="h-full" />

          <div className={`flex h-full flex-col rounded-xl border p-5 sm:p-6 ${themeClasses.card.primary}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isDarkMode ? "bg-violet-950/60" : "bg-violet-50"}`}>
                <Printer className={`h-5 w-5 ${isDarkMode ? "text-violet-300" : "text-violet-700"}`} />
              </span>
              <div>
                <h2 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
                  Check a refill status
                </h2>
                <p className={`text-[13px] ${themeClasses.text.secondary}`}>
                  Enter the last name on the order
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-1 flex-col justify-center space-y-4">
              <div>
                <Label htmlFor="refill-last-name" className={`mb-1.5 block text-sm font-medium ${themeClasses.text.primary}`}>
                  Last name
                </Label>
                <Input
                  id="refill-last-name"
                  placeholder="e.g. Smith"
                  value={refillLastName}
                  onChange={(e) => setRefillLastName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !refillLoading) checkRefillStatus();
                  }}
                  className={`h-11 ${themeClasses.input}`}
                />
              </div>

              <Button
                onClick={checkRefillStatus}
                disabled={refillLoading}
                className={`h-11 w-full font-medium ${themeClasses.button.primary}`}
              >
                {refillLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Check status
              </Button>

              {refillResults && (
                <div className={`space-y-3 rounded-lg border p-4 ${themeClasses.card.secondary}`}>
                  <p className={`text-sm ${themeClasses.text.secondary}`}>
                    {refillResults.length === 1
                      ? "Your refill status:"
                      : `We found ${refillResults.length} refills under that name:`}
                  </p>

                  {refillResults.map((result) => (
                    <div key={result.orderId} className="flex flex-col items-start gap-1">
                      <Badge className={`px-4 py-1 text-base ${STATUS_COLORS[result.status] || STATUS_COLORS.in_progress}`}>
                        {result.status === 'ready' ? (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        ) : (
                          <Clock className="h-4 w-4 mr-2" />
                        )}
                        {STATUS_LABELS[result.status] || result.status}
                      </Badge>
                      {/* Only useful for telling several refills apart. */}
                      {refillResults.length > 1 && (
                        <span className={`font-mono text-xs tabular-nums ${themeClasses.text.muted}`}>
                          {result.orderId}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {refillError && (
                <div className={`flex items-start gap-2 rounded-lg border p-4 ${themeClasses.status.error}`}>
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="text-sm">{refillError}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Services */}
        <section>
          <h2 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
            What we do
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((service, index) => (
              <div key={index} className={`flex items-start gap-3 rounded-lg border p-4 ${themeClasses.card.secondary}`}>
                <service.icon className={`mt-0.5 h-5 w-5 shrink-0 ${themeClasses.text.accent}`} />
                <div>
                  <p className={`font-medium ${themeClasses.text.primary}`}>
                    {service.title}
                  </p>
                  <p className={`mt-0.5 text-[14px] leading-relaxed ${themeClasses.text.secondary}`}>
                    {service.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className={`mt-5 text-sm font-medium ${themeClasses.text.primary}`}>
            Also at the counter
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {additionalServices.map((service, index) => (
              <span
                key={index}
                className={`rounded-full border px-3 py-1.5 text-sm ${themeClasses.card.secondary} ${themeClasses.text.secondary}`}
              >
                {service}
              </span>
            ))}
          </div>
        </section>

        {/* Business Hours & Contact */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Business Hours */}
          <div className={`rounded-xl border p-5 sm:p-6 ${themeClasses.card.primary}`}>
            <h2 className={`flex items-center gap-2 text-lg font-semibold ${themeClasses.text.primary}`}>
              <Clock className="h-5 w-5" />
              Business hours
            </h2>
            <div className="mt-4">
              {businessHours.map((schedule, index) => (
                <div
                  key={index}
                  className={`flex justify-between py-2.5 first:pt-0 ${
                    index > 0 ? "border-t border-[#e4e1d9] dark:border-[#2a2f3a]" : ""
                  }`}
                >
                  <span className={themeClasses.text.secondary}>{schedule.days}</span>
                  <span className={`font-medium ${themeClasses.text.primary}`}>{schedule.hours}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className={`rounded-xl border p-5 sm:p-6 ${themeClasses.card.primary}`}>
            <h2 className={`flex items-center gap-2 text-lg font-semibold ${themeClasses.text.primary}`}>
              <MapPin className="h-5 w-5" />
              Contact and location
            </h2>
            <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <p className={`font-medium ${themeClasses.text.primary}`}>Address</p>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`rounded-sm hover:underline ${themeClasses.text.accent} ${focusRing}`}
                  >
                    Westbrook Mall, Calgary
                  </a>
                </div>
                <div>
                  <p className={`font-medium ${themeClasses.text.primary}`}>Phone</p>
                  <a
                    href="tel:4036862835"
                    className={`rounded-sm hover:underline ${themeClasses.text.accent} ${focusRing}`}
                  >
                    (403) 686-2835
                  </a>
                </div>
                <div>
                  <p className={`font-medium ${themeClasses.text.primary}`}>Email</p>
                  <a
                    href="mailto:inktonerandmoore@gmail.com"
                    className={`block break-all rounded-sm hover:underline ${themeClasses.text.accent} ${focusRing}`}
                  >
                    inktonerandmoore@gmail.com
                  </a>
                </div>
              </div>

              {/* Map — tap to open directions in Google Maps */}
              <div className="w-full max-w-[14rem] shrink-0 space-y-2 sm:w-56">
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open our location in Google Maps"
                  className={`group relative block overflow-hidden rounded-lg border ${themeClasses.card.secondary} ${focusRing}`}
                >
                  <img
                    src={storeMap}
                    alt="Map showing Ink, Toner & Moore inside Westbrook Mall, Calgary"
                    className="block aspect-[817/700] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 group-focus-visible:scale-105"
                    loading="lazy"
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-black/70 px-3 py-2 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Google Maps
                  </span>
                </a>
                <p className={`text-xs leading-relaxed ${themeClasses.text.secondary}`}>
                  Inside Westbrook Mall, in front of AMA.{" "}
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`rounded-sm font-medium hover:underline ${themeClasses.text.accent} ${focusRing}`}
                  >
                    Get directions
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`mt-4 border-t py-8 ${themeClasses.header}`}>
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className={themeClasses.text.secondary}>
            Ink, Toner &amp; Moore, Westbrook Mall, Calgary. Open 7 days a week.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;
