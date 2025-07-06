import { useState } from "react";
import { Phone, MapPin, Clock, Search, Printer, Key, Recycle, Star, Shield, Award, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import SmartTracker from "@/components/SmartTracker";

const PublicHome = () => {
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedKeyType, setSelectedKeyType] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);

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
      icon: Search,
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
    <div className={`min-h-screen relative overflow-hidden transition-all duration-500 ${isDarkMode ? '' : 'light-theme'}`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900' 
            : 'bg-gradient-to-br from-blue-50 via-indigo-100 to-purple-200'
        }`}></div>
        <div className={`absolute top-0 left-0 w-full h-full transition-all duration-500 ${
          isDarkMode
            ? 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]'
            : 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0.5))]'
        }`}></div>
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse transition-all duration-500 ${
          isDarkMode ? 'bg-purple-500' : 'bg-purple-300'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000 transition-all duration-500 ${
          isDarkMode ? 'bg-blue-500' : 'bg-blue-300'
        }`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500 transition-all duration-500 ${
          isDarkMode ? 'bg-indigo-500' : 'bg-indigo-300'
        }`}></div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 rounded-full opacity-30 animate-bounce transition-all duration-500 ${
                isDarkMode ? 'bg-white' : 'bg-gray-600'
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${6 + Math.random() * 8}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Header with Staff Login Link */}
      <header className={`backdrop-blur-xl border-b sticky top-0 z-50 shadow-2xl transition-all duration-500 ${
        isDarkMode 
          ? 'bg-white/10 border-white/20' 
          : 'bg-white/50 border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl transform hover:scale-110 transition-all duration-300">
                <Printer className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-500 ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-white to-blue-100' 
                    : 'bg-gradient-to-r from-gray-800 to-blue-600'
                }`}>
                  Ink, Toner, & Moore
                </h1>
                <p className={`text-xs font-medium transition-all duration-500 ${
                  isDarkMode ? 'text-blue-200' : 'text-blue-600'
                }`}>Professional Office Services</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Staff Login Link */}
              <Link to="/staff">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`px-4 py-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 ${
                    isDarkMode 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : 'bg-gray-200/50 hover:bg-gray-200/70 text-gray-700'
                  }`}
                >
                  Staff Login
                </Button>
              </Link>
              
              {/* Theme Toggle */}
              <Button
                onClick={() => setIsDarkMode(!isDarkMode)}
                variant="ghost"
                size="sm"
                className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 ${
                  isDarkMode 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : 'bg-gray-200/50 hover:bg-gray-200/70 text-gray-700'
                }`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              
              <div className="hidden md:flex items-center space-x-8 text-sm">
                <a href="tel:4036862835" className={`flex items-center space-x-2 transition-all hover:scale-105 group ${
                  isDarkMode ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                }`}>
                  <div className={`backdrop-blur-sm p-2 rounded-full group-hover:shadow-lg transition-all duration-300 ${
                    isDarkMode ? 'bg-white/20 group-hover:bg-white/30' : 'bg-white/30 group-hover:bg-white/50'
                  }`}>
                    <Phone className="h-4 w-4" />
                  </div>
                  <span className="font-semibold">(403) 686-2835</span>
                </a>
                <div className={`flex items-center space-x-2 ${
                  isDarkMode ? 'text-blue-100' : 'text-blue-600'
                }`}>
                  <div className={`backdrop-blur-sm p-2 rounded-full ${
                    isDarkMode ? 'bg-white/20' : 'bg-white/30'
                  }`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Westbrook Mall, Calgary</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Package Tracking */}
      <section className="py-16 lg:py-24 relative">
        <div className={`absolute inset-0 backdrop-blur-sm transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-blue-600/10 to-purple-600/20' 
            : 'bg-gradient-to-br from-blue-200/30 to-purple-300/40'
        }`}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center space-x-2 backdrop-blur-lg px-6 py-3 rounded-full text-sm font-medium mb-8 shadow-2xl transform hover:scale-105 transition-all duration-300 ${
              isDarkMode 
                ? 'bg-white/20 text-white border-white/30' 
                : 'bg-white/30 text-gray-700 border-gray-300/50'
            } border`}>
              <Star className="h-4 w-4 animate-pulse" />
              <span>Calgary's Trusted Office Solution</span>
            </div>
            <h2 className={`text-4xl lg:text-6xl font-bold mb-8 leading-tight drop-shadow-2xl transition-all duration-500 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Your Complete 
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse"> Office & Shipping</span>
              <br />Solution
            </h2>
            <p className={`text-xl lg:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed drop-shadow-lg transition-all duration-500 ${
              isDarkMode ? 'text-blue-100' : 'text-gray-600'
            }`}>
              Located in Westbrook Mall, Calgary - providing premium ink cartridges, professional key cutting, reliable shipping services, and comprehensive office solutions to our community.
            </p>
            
            {/* Features Pills */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {features.map((feature, index) => (
                <div key={index} className={`flex items-center space-x-2 backdrop-blur-lg px-6 py-3 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 border ${
                  isDarkMode 
                    ? 'bg-white/20 border-white/30 hover:bg-white/30' 
                    : 'bg-white/30 border-gray-300/50 hover:bg-white/40'
                }`}>
                  <feature.icon className={`h-4 w-4 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>{feature.text}</span>
                </div>
              ))}
            </div>
            
            {/* Smart Tracker Component */}
            <SmartTracker isDarkMode={isDarkMode} className="max-w-5xl mx-auto" />
          </div>
        </div>
      </section>

      {/* Interactive Availability Checkers */}
      <section className="py-20 relative">
        <div className={`absolute inset-0 backdrop-blur-sm transition-all duration-500 ${
          isDarkMode ? 'bg-white/5' : 'bg-white/20'
        }`}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 drop-shadow-2xl transition-all duration-500 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Check Availability
            </h2>
            <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${
              isDarkMode ? 'text-blue-100' : 'text-gray-600'
            }`}>
              Instantly verify if we have what you need in stock
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Ink & Toner Checker */}
            <Card className={`hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 border-0 shadow-2xl backdrop-blur-xl overflow-hidden group border hover:bg-opacity-30 ${
              isDarkMode 
                ? 'bg-white/15 border-white/30 hover:bg-white/20' 
                : 'bg-white/30 border-gray-300/50 hover:bg-white/40'
            }`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 group-hover:h-2 transition-all duration-300"></div>
              <CardHeader className="pb-4">
                <CardTitle className={`flex items-center space-x-3 text-xl drop-shadow-lg transition-all duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Printer className="h-6 w-6 text-white" />
                  </div>
                  <span>Ink & Toner Cartridges</span>
                </CardTitle>
                <CardDescription className={`text-base transition-all duration-500 ${
                  isDarkMode ? 'text-blue-100' : 'text-gray-600'
                }`}>Check if we have your cartridge in stock</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger className={`h-12 border-2 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
                    isDarkMode 
                      ? 'border-white/30 bg-white/10 text-white hover:border-blue-400' 
                      : 'border-gray-300/50 bg-white/20 text-gray-700 hover:border-blue-500'
                  }`}>
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
                    <SelectTrigger className={`h-12 border-2 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
                      isDarkMode 
                        ? 'border-white/30 bg-white/10 text-white hover:border-blue-400' 
                        : 'border-gray-300/50 bg-white/20 text-gray-700 hover:border-blue-500'
                    }`}>
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
            <Card className={`hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 border-0 shadow-2xl backdrop-blur-xl overflow-hidden group border hover:bg-opacity-30 ${
              isDarkMode 
                ? 'bg-white/15 border-white/30 hover:bg-white/20' 
                : 'bg-white/30 border-gray-300/50 hover:bg-white/40'
            }`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500 group-hover:h-2 transition-all duration-300"></div>
              <CardHeader className="pb-4">
                <CardTitle className={`flex items-center space-x-3 text-xl drop-shadow-lg transition-all duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  <div className="bg-gradient-to-br from-green-400 to-emerald-600 p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Recycle className="h-6 w-6 text-white" />
                  </div>
                  <span>Ink Jet Refills</span>
                </CardTitle>
                <CardDescription className={`text-base transition-all duration-500 ${
                  isDarkMode ? 'text-green-100' : 'text-green-600'
                }`}>Eco-friendly cartridge refill service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={`backdrop-blur-sm border-2 rounded-xl p-6 shadow-lg transition-all duration-500 ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400/50' 
                    : 'bg-gradient-to-r from-amber-200/50 to-orange-200/50 border-amber-400/70'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`backdrop-blur-sm p-2 rounded-full flex-shrink-0 mt-1 shadow-lg transition-all duration-500 ${
                      isDarkMode ? 'bg-amber-400/30' : 'bg-amber-300/50'
                    }`}>
                      <Search className={`h-4 w-4 transition-all duration-500 ${
                        isDarkMode ? 'text-amber-200' : 'text-amber-700'
                      }`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-1 drop-shadow-lg transition-all duration-500 ${
                        isDarkMode ? 'text-amber-200' : 'text-amber-700'
                      }`}>Important Note</p>
                      <p className={`text-sm drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-amber-100' : 'text-amber-600'
                      }`}>
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
            <Card className={`hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 border-0 shadow-2xl backdrop-blur-xl overflow-hidden group border hover:bg-opacity-30 ${
              isDarkMode 
                ? 'bg-white/15 border-white/30 hover:bg-white/20' 
                : 'bg-white/30 border-gray-300/50 hover:bg-white/40'
            }`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-violet-500 group-hover:h-2 transition-all duration-300"></div>
              <CardHeader className="pb-4">
                <CardTitle className={`flex items-center space-x-3 text-xl drop-shadow-lg transition-all duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  <div className="bg-gradient-to-br from-purple-400 to-violet-600 p-3 rounded-xl shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Key className="h-6 w-6 text-white" />
                  </div>
                  <span>Key Cutting</span>
                </CardTitle>
                <CardDescription className={`text-base transition-all duration-500 ${
                  isDarkMode ? 'text-purple-100' : 'text-purple-600'
                }`}>Professional key cutting services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Select value={selectedKeyType} onValueChange={setSelectedKeyType}>
                  <SelectTrigger className={`h-12 border-2 backdrop-blur-sm transition-all duration-300 hover:shadow-lg ${
                    isDarkMode 
                      ? 'border-white/30 bg-white/10 text-white hover:border-purple-400' 
                      : 'border-gray-300/50 bg-white/20 text-gray-700 hover:border-purple-500'
                  }`}>
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
        <div className={`absolute inset-0 backdrop-blur-sm transition-all duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-slate-900/50 to-indigo-900/50' 
            : 'bg-gradient-to-br from-gray-100/50 to-blue-200/50'
        }`}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 drop-shadow-2xl transition-all duration-500 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Our Services
            </h2>
            <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${
              isDarkMode ? 'text-blue-100' : 'text-gray-600'
            }`}>
              Comprehensive solutions for all your office and shipping needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {services.map((service, index) => (
              <div key={index} className="text-center group hover:scale-110 transition-all duration-500 transform hover:-translate-y-2">
                <div className={`bg-gradient-to-br ${service.color} rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-2xl group-hover:shadow-3xl transition-all duration-500 group-hover:rotate-3 border-2 border-white/30`}>
                  <service.icon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
                <h3 className={`font-bold mb-3 text-lg drop-shadow-lg transition-all duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>{service.title}</h3>
                <p className={`leading-relaxed drop-shadow-sm transition-all duration-500 ${
                  isDarkMode ? 'text-blue-100' : 'text-gray-600'
                }`}>{service.description}</p>
              </div>
            ))}
          </div>

          <div className={`backdrop-blur-xl rounded-3xl shadow-2xl p-10 border transform hover:scale-[1.02] transition-all duration-500 ${
            isDarkMode 
              ? 'bg-white/15 border-white/30' 
              : 'bg-white/25 border-gray-300/50'
          }`}>
            <h3 className={`text-3xl font-bold mb-8 text-center drop-shadow-lg transition-all duration-500 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Additional Services
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {additionalServices.map((service, index) => (
                <div key={index} className={`flex items-center space-x-4 p-4 rounded-xl backdrop-blur-sm transition-all group shadow-lg hover:shadow-xl border ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-400/30 hover:to-indigo-400/30 border-white/20 hover:border-white/40' 
                    : 'bg-gradient-to-r from-blue-200/30 to-indigo-200/30 hover:from-blue-300/40 hover:to-indigo-300/40 border-gray-300/30 hover:border-gray-400/50'
                }`}>
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full group-hover:scale-125 transition-transform shadow-lg animate-pulse"></div>
                  <span className={`font-medium drop-shadow-sm transition-all duration-500 ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Location */}
      <section className="py-20 relative">
        <div className={`absolute inset-0 backdrop-blur-sm transition-all duration-500 ${
          isDarkMode ? 'bg-white/5' : 'bg-white/20'
        }`}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold mb-6 drop-shadow-2xl transition-all duration-500 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>
              Visit Us Today
            </h2>
            <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-all duration-500 ${
              isDarkMode ? 'text-blue-100' : 'text-gray-600'
            }`}>
              Conveniently located in Westbrook Mall with easy access and parking
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div className={`backdrop-blur-xl rounded-3xl p-8 shadow-2xl border transform hover:scale-105 transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-blue-500/20 to-indigo-600/30 border-white/30' 
                  : 'bg-gradient-to-br from-blue-200/40 to-indigo-300/50 border-gray-300/50'
              }`}>
                <h3 className={`text-2xl font-bold mb-6 flex items-center space-x-3 drop-shadow-lg transition-all duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  <div className="bg-blue-500 p-3 rounded-xl shadow-2xl animate-pulse">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <span>Contact Information</span>
                </h3>
                <div className="space-y-6">
                  <a href="tel:4036862835" className={`flex items-center space-x-4 transition-all hover:scale-105 group ${
                    isDarkMode ? 'text-blue-200 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                  }`}>
                    <div className={`backdrop-blur-sm p-3 rounded-xl transition-all duration-300 shadow-lg group-hover:shadow-xl ${
                      isDarkMode ? 'bg-white/20 group-hover:bg-white/30' : 'bg-white/30 group-hover:bg-white/50'
                    }`}>
                      <Phone className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-xl drop-shadow-lg">(403) 686-2835</span>
                  </a>
                  <div className={`flex items-start space-x-4 transition-all duration-500 ${
                    isDarkMode ? 'text-blue-100' : 'text-blue-600'
                  }`}>
                    <div className={`backdrop-blur-sm p-3 rounded-xl shadow-lg ${
                      isDarkMode ? 'bg-white/20' : 'bg-white/30'
                    }`}>
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <p className={`font-bold text-lg drop-shadow-lg transition-all duration-500 ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>1200 37 Street SW Unit 3b</p>
                      <p className={`text-lg drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-blue-100' : 'text-blue-600'
                      }`}>Calgary, AB T3C 1S2</p>
                      <p className={`text-sm mt-2 backdrop-blur-sm px-3 py-1 rounded-full inline-block shadow-lg transition-all duration-500 ${
                        isDarkMode ? 'text-blue-200 bg-white/20' : 'text-blue-600 bg-white/30'
                      }`}>
                        Inside Westbrook Mall, in front of AMA
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`backdrop-blur-xl rounded-3xl p-8 shadow-2xl border transform hover:scale-105 transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-slate-700/30 to-blue-600/30 border-white/30' 
                  : 'bg-gradient-to-br from-gray-200/40 to-blue-300/50 border-gray-300/50'
              }`}>
                <h3 className={`text-2xl font-bold mb-6 flex items-center space-x-3 drop-shadow-lg transition-all duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  <div className={`p-3 rounded-xl shadow-2xl animate-pulse ${
                    isDarkMode ? 'bg-slate-600' : 'bg-gray-500'
                  }`}>
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <span>Business Hours</span>
                </h3>
                <div className="space-y-4">
                  {businessHours.map((schedule, index) => (
                    <div key={index} className={`flex justify-between items-center py-3 px-4 backdrop-blur-sm rounded-xl border shadow-lg transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-white/15 border-white/30 hover:bg-white/20' 
                        : 'bg-white/30 border-gray-300/50 hover:bg-white/40'
                    }`}>
                      <span className={`font-semibold drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>{schedule.days}</span>
                      <span className={`font-medium drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-blue-100' : 'text-blue-600'
                      }`}>{schedule.hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="space-y-8">
              <Card className={`shadow-2xl border-0 backdrop-blur-xl border transform hover:scale-105 transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-white/15 border-white/30' 
                  : 'bg-white/30 border-gray-300/50'
              }`}>
                <CardHeader>
                  <CardTitle className={`text-2xl drop-shadow-lg transition-all duration-500 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Latest Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`backdrop-blur-sm border-2 rounded-xl p-6 mb-6 shadow-lg transition-all duration-500 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-600/30 border-green-400/50' 
                      : 'bg-gradient-to-r from-green-200/50 to-emerald-300/60 border-green-400/70'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-500 p-2 rounded-full shadow-xl animate-pulse">
                        <Star className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className={`font-bold text-lg drop-shadow-lg transition-all duration-500 ${
                          isDarkMode ? 'text-green-200' : 'text-green-700'
                        }`}>🎉 Now accepting Amazon returns!</p>
                        <p className={`mt-2 drop-shadow-sm transition-all duration-500 ${
                          isDarkMode ? 'text-green-100' : 'text-green-600'
                        }`}>Drop off your Amazon returns during business hours - no appointment needed.</p>
                      </div>
                    </div>
                  </div>
                  <div className={`backdrop-blur-sm border-2 rounded-xl p-6 shadow-lg transition-all duration-500 ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-blue-500/20 to-indigo-600/30 border-blue-400/50' 
                      : 'bg-gradient-to-r from-blue-200/50 to-indigo-300/60 border-blue-400/70'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <div className="bg-blue-500 p-2 rounded-full shadow-xl animate-pulse">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className={`font-bold text-lg drop-shadow-lg transition-all duration-500 ${
                          isDarkMode ? 'text-blue-200' : 'text-blue-700'
                        }`}>📦 Shipping price comparison available</p>
                        <p className={`mt-2 drop-shadow-sm transition-all duration-500 ${
                          isDarkMode ? 'text-blue-100' : 'text-blue-600'
                        }`}>We'll help you find the best shipping rates across UPS, FedEx, and Purolator.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`shadow-2xl border-0 backdrop-blur-xl border transform hover:scale-105 transition-all duration-500 ${
                isDarkMode 
                  ? 'bg-white/15 border-white/30' 
                  : 'bg-white/30 border-gray-300/50'
              }`}>
                <CardHeader>
                  <CardTitle className={`text-2xl drop-shadow-lg transition-all duration-500 ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}>Why Choose Us?</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    <li className={`flex items-center space-x-4 p-3 backdrop-blur-sm rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-white/20 hover:bg-blue-400/30' 
                        : 'bg-gradient-to-r from-blue-200/30 to-indigo-200/30 border-gray-300/30 hover:bg-blue-300/40'
                    }`}>
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className={`font-medium drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>Convenient mall location with easy parking</span>
                    </li>
                    <li className={`flex items-center space-x-4 p-3 backdrop-blur-sm rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-white/20 hover:bg-blue-400/30' 
                        : 'bg-gradient-to-r from-blue-200/30 to-indigo-200/30 border-gray-300/30 hover:bg-blue-300/40'
                    }`}>
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className={`font-medium drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>Competitive prices on all services</span>
                    </li>
                    <li className={`flex items-center space-x-4 p-3 backdrop-blur-sm rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-white/20 hover:bg-blue-400/30' 
                        : 'bg-gradient-to-r from-blue-200/30 to-indigo-200/30 border-gray-300/30 hover:bg-blue-300/40'
                    }`}>
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className={`font-medium drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>Friendly, knowledgeable staff</span>
                    </li>
                    <li className={`flex items-center space-x-4 p-3 backdrop-blur-sm rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-white/20 hover:bg-blue-400/30' 
                        : 'bg-gradient-to-r from-blue-200/30 to-indigo-200/30 border-gray-300/30 hover:bg-blue-300/40'
                    }`}>
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full shadow-lg animate-pulse"></div>
                      <span className={`font-medium drop-shadow-sm transition-all duration-500 ${
                        isDarkMode ? 'text-white' : 'text-gray-700'
                      }`}>Extended evening and weekend hours</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`backdrop-blur-xl py-16 border-t shadow-2xl transition-all duration-500 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-slate-900/80 to-indigo-900/90 text-white border-white/20' 
          : 'bg-gradient-to-br from-gray-100/80 to-blue-200/90 text-gray-800 border-gray-300/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-700 p-3 rounded-xl shadow-2xl animate-pulse">
                  <Printer className="h-6 w-6 text-white" />
                </div>
                <div>
                  <span className="font-bold text-xl drop-shadow-lg">Ink, Toner, & Moore</span>
                  <p className={`text-xs transition-all duration-500 ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-600'
                  }`}>Professional Office Services</p>
                </div>
              </div>
              <p className={`leading-relaxed drop-shadow-sm transition-all duration-500 ${
                isDarkMode ? 'text-blue-200' : 'text-gray-600'
              }`}>
                Your trusted local office and shipping services provider in Calgary, offering professional solutions with a personal touch.
              </p>
            </div>
            
            <div>
              <h4 className={`font-bold mb-6 text-lg drop-shadow-lg transition-all duration-500 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Services</h4>
              <ul className={`space-y-3 transition-all duration-500 ${
                isDarkMode ? 'text-blue-200' : 'text-gray-600'
              }`}>
                <li className="hover:text-current transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Ink & Toner Cartridges</li>
                <li className="hover:text-current transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Key Cutting</li>
                <li className="hover:text-current transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Shipping Services</li>
                <li className="hover:text-current transition-colors cursor-pointer transform hover:translate-x-2 duration-300">Printing & Copying</li>
              </ul>
            </div>
            
            <div>
              <h4 className={`font-bold mb-6 text-lg drop-shadow-lg transition-all duration-500 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Contact</h4>
              <div className={`space-y-3 transition-all duration-500 ${
                isDarkMode ? 'text-blue-200' : 'text-gray-600'
              }`}>
                <p className={`font-semibold text-lg drop-shadow-lg transition-all duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>(403) 686-2835</p>
                <p className="drop-shadow-sm">1200 37 Street SW Unit 3b</p>
                <p className="drop-shadow-sm">Calgary, AB T3C 1S2</p>
                <p className={`text-sm transition-all duration-500 ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-600'
                }`}>Inside Westbrook Mall</p>
              </div>
            </div>
          </div>
          
          <div className={`border-t mt-12 pt-8 text-center transition-all duration-500 ${
            isDarkMode ? 'border-white/30' : 'border-gray-300/50'
          }`}>
            <p className={`drop-shadow-sm transition-all duration-500 ${
              isDarkMode ? 'text-blue-300' : 'text-gray-500'
            }`}>&copy; 2024 Ink, Toner, & Moore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;