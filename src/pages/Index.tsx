
import { useState } from "react";
import { Phone, MapPin, Clock, ExternalLink, Search, Printer, Truck, Key, Recycle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedKeyType, setSelectedKeyType] = useState("");

  const trackingLinks = [
    { name: "UPS", url: "https://www.ups.com/track", color: "bg-amber-600" },
    { name: "Purolator", url: "https://www.purolator.com/en/shipping/tracker", color: "bg-blue-600" },
    { name: "FedEx", url: "https://www.fedex.com/en-ca/tracking.html", color: "bg-purple-600" }
  ];

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
      icon: Search,
      title: "Ink Jet Refills",
      description: "Professional refill services - call to verify cartridge compatibility"
    },
    {
      icon: Key,
      title: "Key Cutting & Accessories",
      description: "House, mailbox, and automotive key cutting services"
    },
    {
      icon: Truck,
      title: "Shipping Services",
      description: "UPS, FedEx, Purolator authorized center with competitive pricing"
    }
  ];

  const additionalServices = [
    "Amazon Returns Accepted",
    "Printing, Faxing, Scanning",
    "Photocopying Services", 
    "Card Lamination",
    "Cartridge Recycling"
  ];

  const checkAvailability = (type: string) => {
    if (type === "ink" && selectedBrand && selectedModel) {
      toast({
        title: "Availability Check",
        description: `${selectedBrand} ${selectedModel}: Available - Call (403) 686-2835 to confirm stock`,
      });
    } else if (type === "key" && selectedKeyType) {
      toast({
        title: "Key Cutting Available",
        description: `${selectedKeyType} key cutting: Available - Visit us at Westbrook Mall`,
      });
    } else if (type === "refill") {
      toast({
        title: "Refill Service",
        description: "Not all cartridges can be refilled - Call (403) 686-2835 to verify compatibility",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Printer className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl lg:text-2xl font-bold text-slate-800">
                Ink, Toner, & Moore
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <a href="tel:4036862835" className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors">
                <Phone className="h-4 w-4" />
                <span>(403) 686-2835</span>
              </a>
              <div className="flex items-center space-x-1 text-slate-600">
                <MapPin className="h-4 w-4" />
                <span>Westbrook Mall, Calgary</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-5xl font-bold text-slate-800 mb-4">
              Your Complete Office & Shipping Solution
            </h2>
            <p className="text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              Located in Westbrook Mall, Calgary - providing ink cartridges, key cutting, shipping services, and more to our community since day one.
            </p>
            
            {/* Package Tracking */}
            <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold text-slate-800 mb-4">Track Your Package</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {trackingLinks.map((link) => (
                  <Button
                    key={link.name}
                    onClick={() => window.open(link.url, '_blank')}
                    className={`${link.color} hover:opacity-90 text-white font-medium py-3 px-6 rounded-lg transition-all hover:scale-105`}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Track with {link.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Availability Checkers */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            Check Availability
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ink & Toner Checker */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Printer className="h-5 w-5 text-blue-600" />
                  <span>Ink & Toner Cartridges</span>
                </CardTitle>
                <CardDescription>Check if we have your cartridge in stock</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Printer Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="epson">Epson</SelectItem>
                    <SelectItem value="hp">HP</SelectItem>
                    <SelectItem value="canon">Canon</SelectItem>
                  </SelectContent>
                </Select>
                
                {selectedBrand && (
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Model</SelectItem>
                      <SelectItem value="pro">Professional Series</SelectItem>
                      <SelectItem value="office">Office Series</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <Button 
                  onClick={() => checkAvailability("ink")}
                  disabled={!selectedBrand || !selectedModel}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Check Availability
                </Button>
              </CardContent>
            </Card>

            {/* Ink Jet Refills */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Recycle className="h-5 w-5 text-green-600" />
                  <span>Ink Jet Refills</span>
                </CardTitle>
                <CardDescription>Eco-friendly cartridge refill service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Not all cartridges can be refilled. Call to verify compatibility before visiting.
                  </p>
                </div>
                <Button 
                  onClick={() => checkAvailability("refill")}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Check Refill Service
                </Button>
              </CardContent>
            </Card>

            {/* Key Cutting */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5 text-purple-600" />
                  <span>Key Cutting</span>
                </CardTitle>
                <CardDescription>Professional key cutting services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedKeyType} onValueChange={setSelectedKeyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Key Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House Keys</SelectItem>
                    <SelectItem value="mailbox">Mailbox Keys</SelectItem>
                    <SelectItem value="automotive">Automotive Keys</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={() => checkAvailability("key")}
                  disabled={!selectedKeyType}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Check Key Service
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            Our Services
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {services.map((service, index) => (
              <div key={index} className="text-center group">
                <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-md group-hover:shadow-lg transition-shadow">
                  <service.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">{service.title}</h3>
                <p className="text-sm text-slate-600">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-semibold text-slate-800 mb-6 text-center">
              Additional Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {additionalServices.map((service, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-slate-700">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-12">
            Visit Us Today
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-4">Contact Information</h3>
                <div className="space-y-3">
                  <a href="tel:4036862835" className="flex items-center space-x-3 text-blue-600 hover:text-blue-800 transition-colors">
                    <Phone className="h-5 w-5" />
                    <span className="font-medium">(403) 686-2835</span>
                  </a>
                  <div className="flex items-start space-x-3 text-slate-700">
                    <MapPin className="h-5 w-5 mt-1" />
                    <div>
                      <p className="font-medium">1200 37 Street SW Unit 3b</p>
                      <p>Calgary, AB T3C 1S2</p>
                      <p className="text-sm text-slate-500 mt-1">Inside Westbrook Mall, in front of AMA</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Business Hours</span>
                </h3>
                <div className="space-y-2">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center py-1">
                      <span className="text-slate-700 font-medium">{schedule.days}</span>
                      <span className="text-slate-600">{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Latest Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-800 font-medium">🎉 Now accepting Amazon returns!</p>
                    <p className="text-green-700 text-sm mt-1">Drop off your Amazon returns during business hours - no appointment needed.</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 font-medium">📦 Shipping price comparison available</p>
                    <p className="text-blue-700 text-sm mt-1">We'll help you find the best shipping rates across UPS, FedEx, and Purolator.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Why Choose Us?</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>Convenient mall location with easy parking</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>Competitive prices on all services</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>Friendly, knowledgeable staff</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>Extended evening and weekend hours</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Printer className="h-6 w-6" />
                <span className="font-bold text-lg">Ink, Toner, & Moore</span>
              </div>
              <p className="text-slate-300 text-sm">
                Your trusted local office and shipping services provider in Calgary.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Services</h4>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>Ink & Toner Cartridges</li>
                <li>Key Cutting</li>
                <li>Shipping Services</li>
                <li>Printing & Copying</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Contact</h4>
              <div className="space-y-1 text-sm text-slate-300">
                <p>(403) 686-2835</p>
                <p>1200 37 Street SW Unit 3b</p>
                <p>Calgary, AB T3C 1S2</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 Ink, Toner, & Moore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
