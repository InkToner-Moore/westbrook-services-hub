import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Truck } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";

interface SmartTrackerProps {
  isDarkMode?: boolean;
  className?: string;
}

const SmartTracker = ({ isDarkMode = true, className = "" }: SmartTrackerProps) => {
  const { isFeatureEnabled } = useSystemSettings();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courierDetection, setCourierDetection] = useState<any>(null);

  // If package tracking is disabled, don't render the component
  if (!isFeatureEnabled('modules.packageTracking.enabled')) {
    return null;
  }

  const detectCourierAdvanced = (trackingNumber: string) => {
    const clean = trackingNumber.replace(/[\s\-]/g, '').toUpperCase();
    
    if (clean.match(/^1Z[A-Z0-9]{16}$/)) {
        return { courier: 'UPS', format: '1Z Standard (18 chars)', confidence: 100 };
    }
    if (clean.match(/^T\d{10}$/)) {
        return { courier: 'UPS', format: 'T-prefixed (11 chars)', confidence: 100 };
    }
    
    if (clean.match(/^\d{9}$/) && !clean.match(/^[0-2]/)) {
        return { courier: 'UPS', format: '9-digit', confidence: 90 };
    }
    
    if (clean.match(/^92(612|748)\d{15,17}$/)) {
        return { courier: 'FedEx', format: 'SmartPost', confidence: 100 };
    }
    
    if (clean.match(/^0[01]\d+$/)) {
        return { courier: 'FedEx', format: 'Custom Critical', confidence: 95 };
    }
    
    if (clean.match(/^[A-Z]{3}\d{9}$/)) {
        return { courier: 'Purolator', format: 'Alphanumeric', confidence: 100 };
    }
    
    if (clean.match(/^\d+$/)) {
        const length = clean.length;
        const firstDigit = clean.charAt(0);
        const firstTwoDigits = clean.substring(0, 2);
        
        if (length === 12 && firstDigit === '3') {
            return { courier: 'Purolator', format: '12-digit numeric', confidence: 95 };
        }
        
        if (length === 12) {
            if (firstDigit === '7' || firstDigit === '9') {
                return { courier: 'FedEx', format: 'Express/Ground 12-digit', confidence: 85 };
            }
            if (firstDigit === '1' || firstDigit === '4' || firstDigit === '6') {
                return { courier: 'FedEx', format: 'Express 12-digit', confidence: 80 };
            }
        }
        
        if (length === 15) {
            if (firstTwoDigits === '96') {
                return { courier: 'FedEx', format: 'Ground 15-digit', confidence: 90 };
            }
            return { courier: 'FedEx', format: 'Express 15-digit', confidence: 75 };
        }
        
        if (length >= 15 && length <= 25 && firstTwoDigits === '96') {
            return { courier: 'FedEx', format: 'Freight', confidence: 95 };
        }
        
        if (length === 20 || length === 22) {
            if (firstTwoDigits === '96') {
                return { courier: 'FedEx', format: 'Ground Extended', confidence: 90 };
            }
            return { courier: 'FedEx', format: 'Ground/Express Extended', confidence: 70 };
        }
        
        if (length === 10) {
            return { courier: 'FedEx', format: 'Express 10-digit', confidence: 75 };
        }
        
        if (length === 12) {
            return { courier: 'Purolator', format: '12-digit numeric (alternate)', confidence: 60 };
        }
    }
    
    return { courier: 'Unknown', format: 'Unrecognized format', confidence: 0 };
  };

  const validateUPSChecksum = (trackingNumber: string) => {
    const clean = trackingNumber.replace(/[\s\-]/g, '').toUpperCase();
    if (!clean.match(/^1Z[A-Z0-9]{16}$/)) return false;
    
    const sequence = clean.substring(2, 17);
    const checkDigit = parseInt(clean.charAt(17));
    
    let total = 0;
    for (let i = 0; i < sequence.length; i++) {
        const char = sequence.charAt(i);
        let value: number;
        
        if (/\d/.test(char)) {
            value = parseInt(char);
        } else {
            value = char.charCodeAt(0) - 65 + 2;
            if (value > 9) value = value % 10;
        }
        
        if (i % 2 === 0) {
            total += value;
        } else {
            total += value * 2;
        }
    }
    
    const calculatedCheck = (10 - (total % 10)) % 10;
    return calculatedCheck === checkDigit;
  };

  const validateAndDetectCourier = (trackingNumber: string) => {
    const result = detectCourierAdvanced(trackingNumber);
    
    if (result.courier === 'UPS' && result.format === '1Z Standard (18 chars)') {
        if (validateUPSChecksum(trackingNumber)) {
            result.confidence = 100;
            result.validated = true;
        } else {
            result.confidence = 50;
            result.validated = false;
        }
    }
    
    return result;
  };

  const handleTrackingInput = (value: string) => {
    setTrackingNumber(value);
    
    // Only perform smart detection if feature is enabled
    if (isFeatureEnabled('modules.packageTracking.features.smartDetection') && value.trim()) {
      const detection = validateAndDetectCourier(value);
      setCourierDetection(detection);
    } else {
      setCourierDetection(null);
    }
  };

  const handleTrackPackage = () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Please enter a tracking number",
        description: "Enter your tracking number to continue",
      });
      return;
    }

    if (!courierDetection || courierDetection.courier === 'Unknown') {
      toast({
        title: "Invalid tracking number",
        description: "Please check your tracking number and try again",
      });
      return;
    }

    let trackingUrl = '';
    switch (courierDetection.courier) {
      case 'UPS':
        trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
        break;
      case 'FedEx':
        trackingUrl = `https://www.fedex.com/wtrk/track/?trknbr=${trackingNumber}`;
        break;
      case 'Purolator':
        trackingUrl = `https://www.purolator.com/en/shipping/tracker?pin=${trackingNumber}`;
        break;
    }

    if (trackingUrl) {
      window.open(trackingUrl, '_blank');
      toast({
        title: "Tracking opened",
        description: `Opened ${courierDetection.courier} tracking in new tab`,
      });
    }
  };

  // Filter tracking links based on feature settings
  const trackingLinks = [
    { name: "UPS", url: "https://www.ups.com/track", color: "bg-gradient-to-r from-amber-500 to-amber-600" },
    { name: "Purolator", url: "https://www.purolator.com/en/shipping/tracker", color: "bg-gradient-to-r from-blue-500 to-blue-600" },
    { name: "FedEx", url: "https://www.fedex.com/en-ca/tracking.html", color: "bg-gradient-to-r from-purple-500 to-purple-600" }
  ].filter((link) => {
    // Only show if multi-courier feature is enabled
    if (!isFeatureEnabled('modules.packageTracking.features.multiCourier')) {
      return false;
    }
    return true;
  });

  return (
    <div className={`backdrop-blur-xl rounded-3xl shadow-2xl p-8 border transform hover:scale-[1.02] transition-all duration-500 ${className} ${
      isDarkMode 
        ? 'bg-white/15 border-white/30' 
        : 'bg-white/25 border-gray-300/50'
    }`}>
      <h3 className={`text-3xl font-bold mb-8 flex items-center justify-center space-x-3 drop-shadow-lg transition-all duration-500 ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>
        <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-2 rounded-xl animate-pulse">
          <Truck className="h-6 w-6 text-white" />
        </div>
        <span>Smart Package Tracker</span>
      </h3>
      
      {/* Smart Tracking Input */}
      <div className="mb-8 max-w-2xl mx-auto">
        <div className="relative">
          <Input
            placeholder="Enter any tracking number..."
            value={trackingNumber}
            onChange={(e) => handleTrackingInput(e.target.value)}
            className={`h-14 text-lg rounded-2xl border-2 backdrop-blur-sm transition-all duration-300 ${
              isDarkMode 
                ? 'bg-white/10 border-white/30 text-white placeholder:text-blue-200 hover:border-blue-400 focus:border-blue-400' 
                : 'bg-white/50 border-gray-300/50 text-gray-700 placeholder:text-gray-500 hover:border-blue-500 focus:border-blue-500'
            }`}
          />
          {courierDetection && (
            <div className={`absolute right-3 top-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
              courierDetection.courier === 'Unknown'
                ? isDarkMode ? 'bg-red-500/20 text-red-300 border border-red-400/50' : 'bg-red-100 text-red-600 border border-red-300'
                : courierDetection.courier === 'UPS'
                ? isDarkMode ? 'bg-amber-500/20 text-amber-300 border border-amber-400/50' : 'bg-amber-100 text-amber-700 border border-amber-300'
                : courierDetection.courier === 'FedEx'
                ? isDarkMode ? 'bg-purple-500/20 text-purple-300 border border-purple-400/50' : 'bg-purple-100 text-purple-700 border border-purple-300'
                : isDarkMode ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50' : 'bg-blue-100 text-blue-700 border border-blue-300'
            }`}>
              {courierDetection.courier === 'Unknown' ? '❌ Invalid' : `✅ ${courierDetection.courier}`}
            </div>
          )}
        </div>
        {courierDetection && courierDetection.courier !== 'Unknown' && (
          <p className={`text-sm mt-2 text-center transition-all duration-500 ${
            isDarkMode ? 'text-blue-200' : 'text-gray-600'
          }`}>
            Detected: {courierDetection.format} ({courierDetection.confidence}% confidence)
          </p>
        )}
        <Button
          onClick={handleTrackPackage}
          className="w-full mt-4 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
        >
          Track Package
        </Button>
      </div>

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
  );
};

export default SmartTracker;