import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";

interface SmartTrackerProps {
  isDarkMode?: boolean;
  className?: string;
}

const SmartTracker = ({ isDarkMode = true, className = "" }: SmartTrackerProps) => {
  const { isFeatureEnabled } = useSystemSettings();
  const { themeClasses } = useTheme();
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
          Enter your tracking number to get started
        </p>
      </div>
      
      {/* Smart Tracking Input */}
      <div className="max-w-md mx-auto space-y-4">
        <div className="relative">
          <Input
            placeholder="Enter tracking number..."
            value={trackingNumber}
            onChange={(e) => handleTrackingInput(e.target.value)}
            className={`h-12 text-center transition-all duration-200 ${themeClasses.input}`}
          />
          {courierDetection && (
            <div className={`absolute right-3 top-3 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
              courierDetection.courier === 'Unknown'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : courierDetection.courier === 'UPS'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                : courierDetection.courier === 'FedEx'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            }`}>
              {courierDetection.courier === 'Unknown' ? 'Invalid' : courierDetection.courier}
            </div>
          )}
        </div>
        
        {courierDetection && courierDetection.courier !== 'Unknown' && (
          <p className={`text-sm text-center ${themeClasses.text.muted}`}>
            Detected: {courierDetection.format} ({courierDetection.confidence}% confidence)
          </p>
        )}
        
        <Button
          onClick={handleTrackPackage}
          className={`w-full h-12 font-semibold transition-all duration-200 ${themeClasses.button.primary}`}
          disabled={!trackingNumber.trim()}
        >
          Track Package
        </Button>
      </div>
    </div>
  );
};

export default SmartTracker;