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
    { name: "UPS", url: "https://www.ups.com/track", color: "bg-gradient-to-r from-amber-500 to-amber-600", shadow: "shadow-amber-200" },
    { name: "Purolator", url: "https://www.purolator.com/en/shipping/tracker", color: "bg-gradient-to-r from-blue-500 to-blue-600", shadow: "shadow-blue-200" },
    { name: "FedEx", url: "https://www.fedex.com/en-ca/tracking.html", color: "bg-gradient-to-r from-purple-500 to-purple-600", shadow: "shadow-purple-200" }
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
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: Search,
      title: "Ink Jet Refills",
      description: "Professional refill services - call to verify cartridge compatibility",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Key,
      title: "Key Cutting & Accessories",
      description: "House, mailbox, and automotive key cutting services",
      color: "from-purple-500 to-violet-600"
    },
    {
      icon: Truck,
      title: "Shipping Services",
      description: "UPS, FedEx, Purolator authorized center with competitive pricing",
      color: "from-orange-500 to-red-600"
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl transform hover:scale-110 transition-all duration-300">
                <Printer className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent drop-shadow-lg">
                  Ink, Toner, & Moore
                </h1>
                <p className="text-xs text-blue-200 font-medium">Professional Office Services</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8 text-sm">
              <a href="tel:4036862835" className="flex items-center space-x-2 text-blue-200 hover:text-white transition-all hover:scale-105 group">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full group-hover:bg-white/30 transition-all duration-300 group-hover:shadow-lg">
                  <Phone className="h-4 w-4" />
                </div>
                <span className="font-semibold">(403) 686-2835</span>
              </a>
              <div className="flex items-center space-x-2 text-blue-100">
                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                  <MapPin className="h-4 w-4" />
                </div>
                <span className="font-medium">Westbrook Mall, Calgary</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 lg:py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/20 backdrop-blur-sm"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-lg text-white px-6 py-3 rounded-full text-sm font-medium mb-8 shadow-2xl border border-white/30 transform hover:scale-105 transition-all duration-300">
              <Star className="h-4 w-4 animate-pulse" />
              <span>Calgary's Trusted Office Solution</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8 leading-tight drop-shadow-2xl">
              Your Complete 
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse"> Office & Shipping</span>
              <br />Solution
            </h2>
            <p className="text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto mb-12 leading-relaxed drop-shadow-lg">
              Located in Westbrook Mall, Calgary - providing premium ink cartridges, professional key cutting, reliable shipping services, and comprehensive office solutions to our community.
            </p>
            
            {/* Features Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 bg-white/20 backdrop-blur-lg px-6 py-3 rounded-full shadow-2xl border border-white/30 transform hover:scale-105 transition-all duration-300 hover:bg-white/30">
                  <feature.icon className="h-4 w-4 text-blue-300" />
                  <span className="text-sm font-medium text-white">{feature.text}</span>
                </div>
              ))}
            </div>
            
            {/* Package Tracking */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-5xl mx-auto border border-white/30 transform hover:scale-[1.02] transition-all duration-500">
              <h3 className="text-3xl font-bold text-white mb-8 flex items-center justify-center space-x-3 drop-shadow-lg">
                <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-2 rounded-xl animate-pulse">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <span>Track Your Package</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trackingLinks.map((link) => (
                  <Button
                    key={link.name}
                    onClick={() => window.open(link.url, '_blank')}
                    className={`${link.color} hover:opacity-90 text-white font-bold py-6 px-8 rounded-2xl transition-all duration-300 hover:scale-110 hover:shadow-2xl shadow-xl group border-2 border-white/20`}
                  >
                    <ExternalLink className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                    Track with {link.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Availability Checkers */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6 drop-shadow-2xl">
              Check Availability
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-lg">
              Instantly verify if we have what you need in stock
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ink & Toner Checker */}
            <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 border-0 shadow-2xl bg-white/15 backdrop-blur-xl overflow-hidden group border border-white/30 hover:bg-white/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 group-hover:h-2 transition-all duration-300"></div>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-xl text-white drop-shadow-lg">
                  <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Printer className="h-6 w-6 text-white" />
                  </div>
                  <span>Ink & Toner Cartridges</span>
                </CardTitle>
                <CardDescription className="text-base text-blue-100">Check if we have your cartridge in stock</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className="h-12 border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
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
                    <SelectTrigger className="h-12 border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
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
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
                >
                  Check Availability
                </Button>
              </CardContent>
            </Card>

            {/* Ink Jet Refills */}
            <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 border-0 shadow-2xl bg-white/15 backdrop-blur-xl overflow-hidden group border border-white/30 hover:bg-white/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500 group-hover:h-2 transition-all duration-300"></div>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-xl text-white drop-shadow-lg">
                  <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Recycle className="h-6 w-6 text-white" />
                  </div>
                  <span>Ink Jet Refills</span>
                </CardTitle>
                <CardDescription className="text-base text-green-100">Eco-friendly cartridge refill service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border-2 border-amber-400/50 rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-3">
                    <div className="bg-amber-400/30 backdrop-blur-sm p-2 rounded-full flex-shrink-0 mt-1 shadow-lg">
                      <Search className="h-4 w-4 text-amber-200" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-200 mb-1 drop-shadow-lg">Important Note</p>
                      <p className="text-sm text-amber-100 drop-shadow-sm">
                        Not all cartridges can be refilled. Call to verify compatibility before visiting.
                      </p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => checkAvailability("refill")}
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
                >
                  Check Refill Service
                </Button>
              </CardContent>
            </Card>

            {/* Key Cutting */}
            <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 border-0 shadow-2xl bg-white/15 backdrop-blur-xl overflow-hidden group border border-white/30 hover:bg-white/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-violet-500 group-hover:h-2 transition-all duration-300"></div>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-3 text-xl text-white drop-shadow-lg">
                  <div className="bg-gradient-to-br from-purple-400 to-violet-600 p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Key className="h-6 w-6 text-white" />
                  </div>
                  <span>Key Cutting</span>
                </CardTitle>
                <CardDescription className="text-base text-purple-100">Professional key cutting services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Select value={selectedKeyType} onValueChange={setSelectedKeyType}>
                  <SelectTrigger className="h-12 border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:border-purple-400 transition-all duration-300 hover:shadow-lg">
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
                  className="w-full h-12 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-400 hover:to-violet-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
                >
                  Check Key Service
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 to-indigo-900/50 backdrop-blur-sm"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6 drop-shadow-2xl">
              Our Services
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-lg">
              Comprehensive solutions for all your office and shipping needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {services.map((service, index) => (
              <div key={index} className="text-center group hover:scale-110 transition-all duration-500 transform hover:-translate-y-2">
                <div className={`bg-gradient-to-br ${service.color} rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:rotate-3 border-2 border-white/30`}>
                  <service.icon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                <h3 className="font-bold text-white mb-3 text-lg drop-shadow-lg">{service.title}</h3>
                <p className="text-blue-100 leading-relaxed drop-shadow-sm">{service.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-white/15 backdrop-blur-xl rounded-3xl shadow-2xl p-10 border border-white/30 transform hover:scale-[1.02] transition-all duration-500">
            <h3 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">
              Additional Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {additionalServices.map((service, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm hover:from-blue-400/30 hover:to-indigo-400/30 transition-all group border border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full group-hover:scale-125 transition-transform shadow-lg animate-pulse"></div>
                  <span className="text-white font-medium drop-shadow-sm">{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6 drop-shadow-2xl">
              Visit Us Today
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-lg">
              Conveniently located in Westbrook Mall with easy access and parking
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-blue-500/20 to-indigo-600/30 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30 transform hover:scale-105 transition-all duration-500">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3 drop-shadow-lg">
                  <div className="bg-blue-500 p-3 rounded-xl shadow-2xl animate-pulse">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <span>Contact Information</span>
                </h3>
                <div className="space-y-6">
                  <a href="tel:4036862835" className="flex items-center space-x-4 text-blue-200 hover:text-white transition-all hover:scale-105 group">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:bg-white/30 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                      <Phone className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-xl drop-shadow-lg">(403) 686-2835</span>
                  </a>
                  <div className="flex items-start space-x-4 text-blue-100">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-white drop-shadow-lg">1200 37 Street SW Unit 3b</p>
                      <p className="text-lg text-blue-100 drop-shadow-sm">Calgary, AB T3C 1S2</p>
                      <p className="text-sm text-blue-200 mt-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full inline-block shadow-lg">
                        Inside Westbrook Mall, in front of AMA
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-700/30 to-blue-600/30 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/30 transform hover:scale-105 transition-all duration-500">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3 drop-shadow-lg">
                  <div className="bg-slate-600 p-3 rounded-xl shadow-2xl animate-pulse">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span>Business Hours</span>
                </h3>
                <div className="space-y-4">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className="flex justify-between items-center py-3 px-4 bg-white/15 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg hover:bg-white/20 transition-all duration-300">
                      <span className="text-white font-semibold drop-shadow-sm">{schedule.days}</span>
                      <span className="text-blue-100 font-medium drop-shadow-sm">{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="space-y-8">
              <Card className="shadow-2xl border-0 bg-white/15 backdrop-blur-xl border border-white/30 transform hover:scale-105 transition-all duration-500">
                <CardHeader>
                  <CardTitle className="text-2xl text-white drop-shadow-lg">Latest Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-r from-green-500/20 to-emerald-600/30 backdrop-blur-sm border-2 border-green-400/50 rounded-xl p-6 mb-6 shadow-lg">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-500 p-2 rounded-full shadow-xl animate-pulse">
                        <Star className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-green-200 font-bold text-lg drop-shadow-lg">🎉 Now accepting Amazon returns!</p>
                        <p className="text-green-100 mt-2 drop-shadow-sm">Drop off your Amazon returns during business hours - no appointment needed.</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500/20 to-indigo-600/30 backdrop-blur-sm border-2 border-blue-400/50 rounded-xl p-6 shadow-lg">
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-500 p-2 rounded-full shadow-xl animate-pulse">
                        <Truck className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-blue-200 font-bold text-lg drop-shadow-lg">📦 Shipping price comparison available</p>
                        <p className="text-blue-100 mt-2 drop-shadow-sm">We'll help you find the best shipping rates across UPS, FedEx, and Purolator.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-2xl border-0 bg-white/15 backdrop-blur-xl border border-white/30 transform hover:scale-105 transition-all duration-500">
                <CardHeader>
                  <CardTitle className="text-2xl text-white drop-shadow-lg">Why Choose Us?</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    <li className="flex items-center space-x-4 p-3 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-blue-400/30">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className="font-medium text-white drop-shadow-sm">Convenient mall location with easy parking</span>
                    </li>
                    <li className="flex items-center space-x-4 p-3 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-blue-400/30">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className="font-medium text-white drop-shadow-sm">Competitive prices on all services</span>
                    </li>
                    <li className="flex items-center space-x-4 p-3 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-blue-400/30">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className="font-medium text-white drop-shadow-sm">Friendly, knowledgeable staff</span>
                    </li>
                    <li className="flex items-center space-x-4 p-3 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-blue-400/30">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className="font-medium text-white drop-shadow-sm">Extended evening and weekend hours</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-900/80 to-indigo-900/90 backdrop-blur-xl text-white py-16 border-t border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-3 rounded-xl shadow-2xl animate-pulse">
                  <Printer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl drop-shadow-lg">Ink, Toner, & Moore</span>
                  <p className="text-xs text-blue-300">Professional Office Services</p>
                </div>
              </div>
              <p className="text-blue-200 leading-relaxed drop-shadow-sm">
                Your trusted local office and shipping services provider in Calgary, offering professional solutions with a personal touch.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-lg text-white drop-shadow-lg">Services</h4>
              <ul className="space-y-3 text-blue-200">
                <li className="hover:text-white transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Ink & Toner Cartridges</li>
                <li className="hover:text-white transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Key Cutting</li>
                <li className="hover:text-white transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Shipping Services</li>
                <li className="hover:text-white transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Printing & Copying</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-lg text-white drop-shadow-lg">Contact</h4>
              <div className="space-y-3 text-blue-200">
                <p className="font-semibold text-lg text-white drop-shadow-lg">(403) 686-2835</p>
                <p className="drop-shadow-sm">1200 37 Street SW Unit 3b</p>
                <p className="drop-shadow-sm">Calgary, AB T3C 1S2</p>
                <p className="text-sm text-blue-300">Inside Westbrook Mall</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/30 mt-12 pt-8 text-center">
            <p className="text-blue-300 drop-shadow-sm">&copy; 2024 Ink, Toner, & Moore. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
};

export default Index;
