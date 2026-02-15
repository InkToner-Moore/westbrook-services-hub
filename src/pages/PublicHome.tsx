import { useState } from "react";
import { Phone, MapPin, Clock, Printer, Key, Package, Sun, Moon, Search, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/useTheme";
import SmartTracker from "@/components/SmartTracker";
import { Link } from "react-router-dom";
import { getDocument } from "@/lib/firestore";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  ready: "Ready for Pickup",
  picked_up: "Picked Up",
};

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ready: "bg-green-100 text-green-800 border-green-300",
  picked_up: "bg-gray-100 text-gray-800 border-gray-300",
};

const PublicHome = () => {
  const { isDarkMode, toggleTheme, themeClasses } = useTheme();

  // Refill status checker state
  const [refillOrderId, setRefillOrderId] = useState("");
  const [refillPhone, setRefillPhone] = useState("");
  const [refillStatus, setRefillStatus] = useState<string | null>(null);
  const [refillError, setRefillError] = useState<string | null>(null);
  const [refillLoading, setRefillLoading] = useState(false);

  const checkRefillStatus = async () => {
    if (!refillOrderId.trim() || !refillPhone.trim()) {
      setRefillError("Please enter both your Order ID and phone number.");
      setRefillStatus(null);
      return;
    }

    setRefillLoading(true);
    setRefillError(null);
    setRefillStatus(null);

    try {
      const doc = await getDocument<{ orderId: string; customerPhone: string; status: string }>(
        'orderStatus',
        refillOrderId.trim().toUpperCase()
      );

      if (doc && doc.customerPhone === refillPhone.trim()) {
        setRefillStatus(doc.status);
      } else {
        setRefillError("No order found. Please check your Order ID and phone number.");
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
      title: "Ink & Toner Cartridges",
      description: "Compatible and brand-name cartridges for all major printer brands"
    },
    {
      icon: Package,
      title: "Ink Jet Refills",
      description: "Professional refill services - call or visit to verify cartridge compatibility"
    },
    {
      icon: Key,
      title: "Key Cutting Services",
      description: "House, mailbox, and automotive key cutting - call or visit to verify availability"
    },
    {
      icon: Package,
      title: "Shipping Services",
      description: "UPS, FedEx, Purolator authorized center"
    }
  ];

  const additionalServices = [
    "Amazon Returns Accepted",
    "Printing, Faxing, Scanning",
    "Photocopying Services", 
    "Card Lamination",
    "Cartridge Recycling"
  ];

  return (
    <div className={`min-h-screen transition-all duration-300 ${themeClasses.background}`}>
      {/* Header */}
      <header className={`border-b transition-all duration-300 ${themeClasses.header}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg shrink-0">
                <Printer className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className={`text-sm sm:text-xl font-bold leading-tight ${themeClasses.text.primary}`}>
                  Ink, Toner, & Moore
                </h1>
                <p className={`text-xs sm:text-sm ${themeClasses.text.secondary}`}>
                  Westbrook Mall, Calgary
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
              <a
                href="tel:4036862835"
                className={`flex items-center space-x-2 p-2 sm:px-4 sm:py-2 rounded-lg transition-colors ${themeClasses.button.primary}`}
              >
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">(403) 686-2835</span>
              </a>

              <Button
                onClick={toggleTheme}
                variant="ghost"
                size="sm"
                className={`p-2 rounded-lg ${themeClasses.button.ghost}`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <Link
                to="/staff"
                className={`hidden sm:block px-4 py-2 rounded-lg transition-colors text-sm ${themeClasses.button.secondary}`}
              >
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h2 className={`text-4xl font-bold mb-4 ${themeClasses.text.primary}`}>
            Your Local Printing & Shipping Solution
          </h2>
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${themeClasses.text.secondary}`}>
            Professional ink, toner, key cutting, and shipping services at Westbrook Mall
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="tel:4036862835"
              className={`px-8 py-3 rounded-lg font-semibold transition-colors ${themeClasses.button.primary}`}
            >
              Call Now: (403) 686-2835
            </a>
            <div className={`px-8 py-3 rounded-lg border ${themeClasses.card.secondary} ${themeClasses.text.secondary}`}>
              <MapPin className="h-5 w-5 inline mr-2" />
              Westbrook Mall, Calgary
            </div>
          </div>
        </section>

        {/* Package Tracker */}
        <section className="mb-16">
          <SmartTracker
            className="max-w-4xl mx-auto"
          />
        </section>

        {/* Refill Status Checker */}
        <section className="mb-16">
          <Card className={`max-w-2xl mx-auto ${themeClasses.card.primary}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 text-center justify-center ${themeClasses.text.primary}`}>
                <Printer className="h-5 w-5" />
                <span>Check Refill Status</span>
              </CardTitle>
              <p className={`text-center text-sm mt-2 ${themeClasses.text.secondary}`}>
                Enter your Order ID and phone number to check the status of your cartridge refill
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className={themeClasses.text.primary}>Order ID</Label>
                  <Input
                    placeholder="e.g. ORD-A7K3M9"
                    value={refillOrderId}
                    onChange={(e) => setRefillOrderId(e.target.value)}
                    className={themeClasses.input}
                  />
                </div>
                <div>
                  <Label className={themeClasses.text.primary}>Phone Number</Label>
                  <Input
                    placeholder="(403) 555-0123"
                    value={refillPhone}
                    onChange={(e) => setRefillPhone(e.target.value)}
                    className={themeClasses.input}
                  />
                </div>
              </div>

              <Button
                onClick={checkRefillStatus}
                disabled={refillLoading}
                className={`w-full font-semibold ${themeClasses.button.primary}`}
              >
                {refillLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Check Status
              </Button>

              {refillStatus && (
                <div className={`rounded-lg p-4 text-center ${themeClasses.card.secondary}`}>
                  <p className={`text-sm mb-2 ${themeClasses.text.secondary}`}>Your refill status:</p>
                  <Badge className={`text-base px-4 py-1 ${STATUS_COLORS[refillStatus] || STATUS_COLORS.received}`}>
                    {refillStatus === 'ready' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    {STATUS_LABELS[refillStatus] || refillStatus}
                  </Badge>
                </div>
              )}

              {refillError && (
                <div className="rounded-lg p-4 text-center bg-red-50 border border-red-200">
                  <div className="flex items-center justify-center space-x-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">{refillError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Services */}
        <section className="mb-16">
          <h3 className={`text-3xl font-bold text-center mb-12 ${themeClasses.text.primary}`}>
            Our Services
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <Card key={index} className={`transition-all duration-200 hover:shadow-lg ${themeClasses.card.primary}`}>
                <CardHeader className="text-center pb-4">
                  <div className={`p-3 rounded-lg w-fit mx-auto mb-4 ${themeClasses.card.secondary}`}>
                    <service.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className={`text-lg ${themeClasses.text.primary}`}>
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-center ${themeClasses.text.secondary}`}>
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Additional Services */}
        <section className="mb-16">
          <Card className={themeClasses.card.primary}>
            <CardHeader>
              <CardTitle className={`text-2xl text-center ${themeClasses.text.primary}`}>
                Additional Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {additionalServices.map((service, index) => (
                  <div key={index} className={`flex items-center space-x-2 ${themeClasses.text.secondary}`}>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{service}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Business Hours & Contact */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Business Hours */}
          <Card className={themeClasses.card.primary}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${themeClasses.text.primary}`}>
                <Clock className="h-5 w-5" />
                <span>Business Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {businessHours.map((schedule, index) => (
                  <div key={index} className="flex justify-between">
                    <span className={themeClasses.text.secondary}>{schedule.days}</span>
                    <span className={`font-semibold ${themeClasses.text.primary}`}>{schedule.hours}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className={themeClasses.card.primary}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${themeClasses.text.primary}`}>
                <MapPin className="h-5 w-5" />
                <span>Contact & Location</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className={`font-semibold ${themeClasses.text.primary}`}>Address</p>
                <p className={themeClasses.text.secondary}>Westbrook Mall, Calgary, AB</p>
              </div>
              <div>
                <p className={`font-semibold ${themeClasses.text.primary}`}>Phone</p>
                <a 
                  href="tel:4036862835" 
                  className={`hover:underline ${themeClasses.text.accent}`}
                >
                  (403) 686-2835
                </a>
              </div>
              <div>
                <p className={`font-semibold ${themeClasses.text.primary}`}>Email</p>
                <a 
                  href="mailto:info@inktonermoore.com" 
                  className={`hover:underline ${themeClasses.text.accent}`}
                >
                  info@inktonermoore.com
                </a>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className={`border-t mt-16 py-8 ${themeClasses.header}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={themeClasses.text.secondary}>
            © 2024 Ink, Toner, & Moore. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;