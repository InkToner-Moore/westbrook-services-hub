
import { useState } from "react";
import { Phone, MapPin, Clock, ExternalLink, Search, Printer, Truck, Key, Recycle, Star, Shield, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedKeyType, setSelectedKeyType] = useState("");

  const trackingLinks = [
    { name: "UPS", url: "https://www.ups.com/track", color: "bg-amber-600", hover: "hover:bg-amber-700" },
    { name: "Purolator", url: "https://www.purolator.com/en/shipping/tracker", color: "bg-slate-600", hover: "hover:bg-slate-700" },
    { name: "FedEx", url: "https://www.fedex.com/en-ca/tracking.html", color: "bg-indigo-600", hover: "hover:bg-indigo-700" }
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
      description: "Compatible and brand-name cartridges for all major printer brands",
      color: "text-slate-700"
    },
    {
      icon: Search,
      title: "Ink Jet Refills",
      description: "Professional refill services - call to verify cartridge compatibility",
      color: "text-slate-700"
    },
    {
      icon: Key,
      title: "Key Cutting & Accessories",
      description: "House, mailbox, and automotive key cutting services",
      color: "text-slate-700"
    },
    {
      icon: Truck,
      title: "Shipping Services",
      description: "UPS, FedEx, Purolator authorized center with competitive pricing",
      color: "text-slate-700"
    }
  ];

  const additionalServices = [
    "Amazon Returns Accepted",
    "Printing, Faxing, Scanning",
    "Photocopying Services", 
    "Card Lamination",
    "Cartridge Recycling"
  ];

  const features = [
    { icon: Shield, text: "Authorized shipping center" },
    { icon: Award, text: "Professional service guarantee" },
    { icon: Star, text: "Competitive pricing" }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-slate-800 p-3 rounded-lg">
                <Printer className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                  Ink, Toner, & Moore
                </h1>
                <p className="text-sm text-slate-600 font-medium">Professional Office Services</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="tel:4036862835" className="flex items-center space-x-3 text-slate-700 hover:text-slate-900 transition-colors group">
                <div className="bg-slate-100 p-2.5 rounded-lg group-hover:bg-slate-200 transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="font-semibold text-lg">(403) 686-2835</span>
              </a>
              <div className="flex items-center space-x-3 text-slate-600">
                <div className="bg-slate-100 p-2.5 rounded-lg">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="font-medium">Westbrook Mall, Calgary</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-slate-100/30"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <div className="inline-flex items-center space-x-2 bg-slate-100 text-slate-700 px-5 py-2.5 rounded-full text-sm font-medium mb-8">
              <Star className="h-4 w-4" />
              <span>Calgary's Trusted Office Solution</span>
            </div>
            <h2 className="text-5xl lg:text-7xl font-bold text-slate-900 mb-8 leading-tight">
              Your Complete 
              <span className="text-slate-700 block"> Office & Shipping</span>
              Solution
            </h2>
            <p className="text-xl lg:text-2xl text-slate-600 max-w-4xl mx-auto mb-16 leading-relaxed">
              Located in Westbrook Mall, Calgary - providing premium ink cartridges, professional key cutting, reliable shipping services, and comprehensive office solutions to our community.
            </p>
            
            {/* Features Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 bg-white/60 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm border border-slate-200/50">
                  <feature.icon className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">{feature.text}</span>
                </div>
              ))}
            </div>
            
            {/* Package Tracking */}
            <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl p-10 max-w-5xl mx-auto border border-slate-200/50">
              <h3 className="text-3xl font-bold text-slate-900 mb-8 flex items-center justify-center space-x-3">
                <Truck className="h-7 w-7 text-slate-700" />
                <span>Track Your Package</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trackingLinks.map((link) => (
                  <Button
                    key={link.name}
                    onClick={() => window.open(link.url, '_blank')}
                    className={`${link.color} ${link.hover} text-white font-semibold py-6 px-8 rounded-xl transition-all hover:scale-105 shadow-lg group`}
                  >
                    <ExternalLink className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform" />
                    Track with {link.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Availability Checkers */}
      <section className="py-24 bg-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Check Availability
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Instantly verify if we have what you need in stock
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ink & Toner Checker */}
            <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-600"></div>
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-4 text-xl">
                  <div className="bg-slate-100 p-4 rounded-xl group-hover:bg-slate-200 transition-colors">
                    <Printer className="h-6 w-6 text-slate-700" />
                  </div>
                  <span className="text-slate-900">Ink & Toner Cartridges</span>
                </CardTitle>
                <CardDescription className="text-base text-slate-600">Check if we have your cartridge in stock</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="h-12 border-2 border-slate-200 hover:border-slate-300 transition-colors bg-white">
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
                    <SelectTrigger className="h-12 border-2 border-slate-200 hover:border-slate-300 transition-colors bg-white">
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
                  className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Check Availability
                </Button>
              </CardContent>
            </Card>

            {/* Ink Jet Refills */}
            <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600"></div>
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-4 text-xl">
                  <div className="bg-emerald-50 p-4 rounded-xl group-hover:bg-emerald-100 transition-colors">
                    <Recycle className="h-6 w-6 text-emerald-700" />
                  </div>
                  <span className="text-slate-900">Ink Jet Refills</span>
                </CardTitle>
                <CardDescription className="text-base text-slate-600">Eco-friendly cartridge refill service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-start space-x-3">
                    <div className="bg-amber-100 p-2 rounded-full flex-shrink-0 mt-1">
                      <Search className="h-4 w-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900 mb-1">Important Note</p>
                      <p className="text-sm text-amber-800">
                        Not all cartridges can be refilled. Call to verify compatibility before visiting.
                      </p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => checkAvailability("refill")}
                  className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Check Refill Service
                </Button>
              </CardContent>
            </Card>

            {/* Key Cutting */}
            <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-4 text-xl">
                  <div className="bg-indigo-50 p-4 rounded-xl group-hover:bg-indigo-100 transition-colors">
                    <Key className="h-6 w-6 text-indigo-700" />
                  </div>
                  <span className="text-slate-900">Key Cutting</span>
                </CardTitle>
                <CardDescription className="text-base text-slate-600">Professional key cutting services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Select value={selectedKeyType} onValueChange={setSelectedKeyType}>
                  <SelectTrigger className="h-12 border-2 border-slate-200 hover:border-slate-300 transition-colors bg-white">
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
                  className="w-full h-12 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Check Key Service
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Our Services
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Comprehensive solutions for all your office and shipping needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {services.map((service, index) => (
              <div key={index} className="text-center group hover:scale-105 transition-all duration-300">
                <div className="bg-white rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all border border-slate-100">
                  <service.icon className="h-8 w-8 text-slate-700" />
                </div>
                <h3 className="font-bold text-slate-900 mb-4 text-lg">{service.title}</h3>
                <p className="text-slate-600 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-12 border border-slate-200/50">
            <h3 className="text-3xl font-bold text-slate-900 mb-10 text-center">
              Additional Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {additionalServices.map((service, index) => (
                <div key={index} className="flex items-center space-x-4 p-5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group">
                  <div className="w-2 h-2 bg-slate-600 rounded-full group-hover:scale-125 transition-transform"></div>
                  <span className="text-slate-700 font-medium">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location */}
      <section className="py-24 bg-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
              Visit Us Today
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Conveniently located in Westbrook Mall with easy access and parking
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-slate-200/50">
                <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center space-x-3">
                  <div className="bg-slate-800 p-3 rounded-xl">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <span>Contact Information</span>
                </h3>
                <div className="space-y-8">
                  <a href="tel:4036862835" className="flex items-center space-x-4 text-slate-700 hover:text-slate-900 transition-all hover:scale-105 group">
                    <div className="bg-slate-100 p-4 rounded-xl group-hover:bg-slate-200 transition-colors">
                      <Phone className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-2xl">(403) 686-2835</span>
                  </a>
                  <div className="flex items-start space-x-4 text-slate-700">
                    <div className="bg-slate-100 p-4 rounded-xl">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">1200 37 Street SW Unit 3b</p>
                      <p className="text-lg">Calgary, AB T3C 1S2</p>
                      <p className="text-sm text-slate-500 mt-3 bg-slate-100 px-4 py-2 rounded-full inline-block">
                        Inside Westbrook Mall, in front of AMA
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-10 shadow-xl border border-slate-200/50">
                <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center space-x-3">
                  <div className="bg-slate-800 p-3 rounded-xl">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span>Business Hours</span>
                </h3>
                <div className="space-y-4">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center py-4 px-6 bg-white/80 rounded-xl border border-slate-200/50">
                      <span className="text-slate-700 font-semibold">{schedule.days}</span>
                      <span className="text-slate-600 font-medium">{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="space-y-8">
              <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-slate-900">Latest Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="bg-emerald-600 p-2 rounded-full">
                        <Star className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-emerald-900 font-bold text-lg">🎉 Now accepting Amazon returns!</p>
                        <p className="text-emerald-800 mt-2">Drop off your Amazon returns during business hours - no appointment needed.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                      <div className="bg-slate-600 p-2 rounded-full">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold text-lg">📦 Shipping price comparison available</p>
                        <p className="text-slate-700 mt-2">We'll help you find the best shipping rates across UPS, FedEx, and Purolator.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-0 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-slate-900">Why Choose Us?</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 text-slate-700">
                    <li className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                      <span className="font-medium">Convenient mall location with easy parking</span>
                    </li>
                    <li className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                      <span className="font-medium">Competitive prices on all services</span>
                    </li>
                    <li className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                      <span className="font-medium">Friendly, knowledgeable staff</span>
                    </li>
                    <li className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                      <span className="font-medium">Extended evening and weekend hours</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center space-x-4 mb-8">
                <div className="bg-white p-3 rounded-xl">
                  <Printer className="h-6 w-6 text-slate-900" />
                </div>
                <div>
                  <span className="font-bold text-xl">Ink, Toner, & Moore</span>
                  <p className="text-xs text-slate-400">Professional Office Services</p>
                </div>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Your trusted local office and shipping services provider in Calgary, offering professional solutions with a personal touch.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-8 text-lg">Services</h4>
              <ul className="space-y-3 text-slate-300">
                <li className="hover:text-white transition-colors cursor-pointer">Ink & Toner Cartridges</li>
                <li className="hover:text-white transition-colors cursor-pointer">Key Cutting</li>
                <li className="hover:text-white transition-colors cursor-pointer">Shipping Services</li>
                <li className="hover:text-white transition-colors cursor-pointer">Printing & Copying</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-8 text-lg">Contact</h4>
              <div className="space-y-3 text-slate-300">
                <p className="font-semibold text-lg">(403) 686-2835</p>
                <p>1200 37 Street SW Unit 3b</p>
                <p>Calgary, AB T3C 1S2</p>
                <p className="text-sm text-slate-400">Inside Westbrook Mall</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-700 mt-16 pt-8 text-center">
            <p className="text-slate-400">&copy; 2024 Ink, Toner, & Moore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
