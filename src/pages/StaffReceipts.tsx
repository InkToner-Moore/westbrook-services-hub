import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Receipt, 
  Package, 
  Key,
  Download,
  Plus,
  Trash2,
  ArrowLeft,
  User,
  LogOut,
  RefreshCw
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import StaffLayout from "@/components/StaffLayout";

interface ShippingAddOn {
  type: string;
  customName?: string;
  cost: number;
  taxes: { name: string; percentage: number; amount: number }[];
}

interface ShippingItem {
  id: string;
  courier: string;
  trackingNumber: string;
  destinationCity: string;
  destinationProvince: string;
  destinationCountry: string;
  shippingCost: number;
  addOns: ShippingAddOn[];
  taxes: { name: string; percentage: number; amount: number }[];
}

interface ShippingReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  shippingItems: ShippingItem[];
  subtotal: number;
  totalTaxes: number;
  total: number;
}

interface KeyReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  keyItems: { model: string; quantity: number; priceEach: number; total: number }[];
  subtotal: number;
  taxes: { name: string; percentage: number; amount: number }[];
  total: number;
}

const generateReceiptNumber = (prefix: string) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  return `${prefix}${year}${month}${day}${hour}${minute}`;
};

const provincialTaxRates = {
  'Alberta': [{ name: 'GST', percentage: 5 }],
  'British Columbia': [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 7 }],
  'Manitoba': [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 7 }],
  'New Brunswick': [{ name: 'HST', percentage: 15 }],
  'Newfoundland and Labrador': [{ name: 'HST', percentage: 15 }],
  'Northwest Territories': [{ name: 'GST', percentage: 5 }],
  'Nova Scotia': [{ name: 'HST', percentage: 14 }],
  'Nunavut': [{ name: 'GST', percentage: 5 }],
  'Ontario': [{ name: 'HST', percentage: 13 }],
  'Prince Edward Island': [{ name: 'HST', percentage: 15 }],
  'Quebec': [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 9.975 }],
  'Saskatchewan': [{ name: 'GST', percentage: 5 }, { name: 'PST', percentage: 6 }],
  'Yukon': [{ name: 'GST', percentage: 5 }]
};

const shippingAddOns = [
  { type: 'Small Box', cost: 5 },
  { type: 'Medium Box', cost: 7 },
  { type: 'Large Box', cost: 10 },
  { type: 'Envelope', cost: 1 },
  { type: 'Padded Envelope', cost: 3 },
  { type: 'Custom', cost: 0 }
];

const StaffReceipts = () => {
  const { user, logout } = useAuth();
  const { themeClasses } = useTheme();
  const [activeTab, setActiveTab] = useState("shipping");
  
  const shippingForm = useForm<ShippingReceiptData>({
    defaultValues: {
      receiptNumber: generateReceiptNumber('SH'),
      date: new Date().toISOString().split('T')[0],
      shippingItems: [{
        id: '1',
        courier: '',
        trackingNumber: '',
        destinationCity: '',
        destinationProvince: 'AB',
        destinationCountry: 'Canada',
        shippingCost: 0,
        addOns: [],
        taxes: provincialTaxRates['Alberta'].map(tax => ({ ...tax, amount: 0 }))
      }]
    }
  });

  const keyForm = useForm<KeyReceiptData>({
    defaultValues: {
      receiptNumber: generateReceiptNumber('KEY'),
      date: new Date().toISOString().split('T')[0],
      keyItems: [{ model: '', quantity: 1, priceEach: 0, total: 0 }],
      taxes: provincialTaxRates['Alberta'].map(tax => ({ ...tax, amount: 0 }))
    }
  });


  const calculateTaxes = (subtotal: number, taxes: { name: string; percentage: number; amount: number }[]) => {
    return taxes.map(tax => ({
      ...tax,
      amount: (subtotal * tax.percentage) / 100
    }));
  };

  const generateNewReceiptNumber = (prefix: string, formType: 'shipping' | 'key') => {
    const newNumber = generateReceiptNumber(prefix);
    if (formType === 'shipping') {
      shippingForm.setValue('receiptNumber', newNumber);
    } else {
      keyForm.setValue('receiptNumber', newNumber);
    }
  };

  const setProvincialTax = (province: string, formType: 'shipping' | 'key', itemIndex?: number) => {
    const taxes = provincialTaxRates[province as keyof typeof provincialTaxRates] || provincialTaxRates['Alberta'];
    const taxesWithAmount = taxes.map(tax => ({ ...tax, amount: 0 }));
    
    if (formType === 'shipping' && itemIndex !== undefined) {
      shippingForm.setValue(`shippingItems.${itemIndex}.taxes`, taxesWithAmount);
    } else if (formType === 'key') {
      keyForm.setValue('taxes', taxesWithAmount);
    }
  };

  const generateShippingPDF = (data: ShippingReceiptData) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header with business name
    pdf.setFillColor(220, 220, 220); // Light gray for print
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INK TONER & MOORE', 20, 16);
    
    // Black line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1);
    pdf.line(0, 25, pageWidth, 25);
    
    // Receipt title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SHIPPING RECEIPT', 20, 40);
    
    // Business info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('1200 37 Street SW Unit 3b', 20, 50);
    pdf.text('Calgary, AB T3C 1S2', 20, 55);
    pdf.text('Phone: (403) 686-2835', 20, 60);
    
    // Receipt details (right side)
    pdf.text(`Receipt #: ${data.receiptNumber}`, 120, 50);
    pdf.text(`Date: ${data.date}`, 120, 55);
    
    // Customer info section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CUSTOMER INFORMATION', 20, 80);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${data.customerName}`, 20, 90);
    pdf.text(`Phone: ${data.customerPhone}`, 20, 95);
    
    // Shipping items section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SHIPPING DETAILS', 20, 110);
    
    let yPos = 120;
    data.shippingItems.forEach((item, index) => {
      // Package header with border
      pdf.setFillColor(240, 240, 240);
      pdf.rect(15, yPos - 3, 170, 8, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Package ${index + 1}`, 20, yPos);
      yPos += 12;
      
      // Create a structured layout
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Service:', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.courier, 60, yPos);
      
      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tracking #:', 25, yPos);
      pdf.setFont('helvetica', 'bold');  // Make tracking number bold
      pdf.text(item.trackingNumber, 60, yPos);
      
      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Destination:', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${item.destinationCity}, ${item.destinationProvince}`, 60, yPos);
      
      yPos += 7;
      pdf.text(`${item.destinationCountry}`, 60, yPos);
      
      yPos += 7;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Shipping Cost:', 25, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`$${item.shippingCost.toFixed(2)}`, 60, yPos);
      
      if (item.addOns.length > 0) {
        yPos += 8;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Add-ons:', 25, yPos);
        item.addOns.forEach(addon => {
          yPos += 6;
          const addonName = addon.type === 'Custom' ? addon.customName : addon.type;
          pdf.setFont('helvetica', 'normal');
          pdf.text(`• ${addonName}:`, 30, yPos);
          pdf.text(`$${addon.cost.toFixed(2)}`, 150, yPos);
          
          if (addon.taxes.length > 0) {
            addon.taxes.forEach(tax => {
              yPos += 5;
              pdf.setFontSize(8);
              pdf.text(`    ${tax.name} (${tax.percentage}%):`, 35, yPos);
              pdf.text(`$${tax.amount.toFixed(2)}`, 150, yPos);
              pdf.setFontSize(9);
            });
          }
        });
      }
      
      if (item.taxes.length > 0) {
        yPos += 8;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Shipping Taxes:', 25, yPos);
        item.taxes.forEach(tax => {
          yPos += 6;
          pdf.setFont('helvetica', 'normal');
          pdf.text(`• ${tax.name} (${tax.percentage}%):`, 30, yPos);
          pdf.text(`$${tax.amount.toFixed(2)}`, 150, yPos);
        });
      }
      
      yPos += 10;
    });
    
    // Pricing section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL CHARGES', 20, yPos);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Subtotal:`, 20, yPos);
    pdf.text(`$${data.subtotal.toFixed(2)}`, 150, yPos);
    
    yPos += 6;
    pdf.text(`Total Taxes:`, 20, yPos);
    pdf.text(`$${data.totalTaxes.toFixed(2)}`, 150, yPos);
    
    // Total with light gray background for print
    yPos += 10;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, yPos - 4, 160, 8, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL:`, 20, yPos);
    pdf.text(`$${data.total.toFixed(2)}`, 150, yPos);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Thank you for choosing Ink Toner & Moore!', 20, 280);
    pdf.text('Located in Westbrook Mall - Your trusted office services provider', 20, 285);
    
    // Save the PDF
    pdf.save(`shipping-receipt-${data.receiptNumber}.pdf`);
  };

  const generateKeyPDF = (data: KeyReceiptData) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header with business name
    pdf.setFillColor(220, 220, 220); // Light gray for print
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INK TONER & MOORE', 20, 16);
    
    // Black line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(1);
    pdf.line(0, 25, pageWidth, 25);
    
    // Receipt title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('KEY CUTTING RECEIPT', 20, 40);
    
    // Business info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('1200 37 Street SW Unit 3b', 20, 50);
    pdf.text('Calgary, AB T3C 1S2', 20, 55);
    pdf.text('Phone: (403) 686-2835', 20, 60);
    
    // Receipt details (right side)
    pdf.text(`Receipt #: ${data.receiptNumber}`, 120, 50);
    pdf.text(`Date: ${data.date}`, 120, 55);
    
    // Customer info section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CUSTOMER INFORMATION', 20, 80);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Name: ${data.customerName}`, 20, 90);
    pdf.text(`Phone: ${data.customerPhone}`, 20, 95);
    
    // Items section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ITEMS', 20, 110);
    
    // Table headers
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Key Model', 20, 120);
    pdf.text('Qty', 80, 120);
    pdf.text('Price Each', 100, 120);
    pdf.text('Total', 140, 120);
    
    // Table line
    pdf.setLineWidth(0.5);
    pdf.line(20, 123, 170, 123);
    
    // Items
    pdf.setFont('helvetica', 'normal');
    let yPos = 130;
    data.keyItems.forEach(item => {
      pdf.text(item.model, 20, yPos);
      pdf.text(item.quantity.toString(), 80, yPos);
      pdf.text(`$${item.priceEach.toFixed(2)}`, 100, yPos);
      pdf.text(`$${item.total.toFixed(2)}`, 140, yPos);
      yPos += 8;
    });
    
    // Pricing section
    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Subtotal:`, 100, yPos);
    pdf.text(`$${data.subtotal.toFixed(2)}`, 140, yPos);
    
    // Taxes
    pdf.setFont('helvetica', 'normal');
    data.taxes.forEach(tax => {
      yPos += 8;
      pdf.text(`${tax.name} (${tax.percentage}%):`, 100, yPos);
      pdf.text(`$${tax.amount.toFixed(2)}`, 140, yPos);
    });
    
    // Total with light gray background for print
    yPos += 12;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(95, yPos - 5, 80, 10, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL:`, 100, yPos);
    pdf.text(`$${data.total.toFixed(2)}`, 140, yPos);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Thank you for choosing Ink Toner & Moore!', 20, 280);
    pdf.text('Located in Westbrook Mall - Your trusted office services provider', 20, 285);
    
    // Save the PDF
    pdf.save(`key-receipt-${data.receiptNumber}.pdf`);
  };

  const onSubmitShipping = (data: ShippingReceiptData) => {
    // Calculate totals for each shipping item and their add-ons
    const updatedItems = data.shippingItems.map(item => {
      // Calculate shipping taxes
      const calculatedShippingTaxes = calculateTaxes(item.shippingCost, item.taxes);
      
      // Calculate add-on taxes separately
      const updatedAddOns = item.addOns.map(addon => {
        const calculatedAddonTaxes = calculateTaxes(addon.cost, addon.taxes);
        return {
          ...addon,
          taxes: calculatedAddonTaxes
        };
      });
      
      return {
        ...item,
        taxes: calculatedShippingTaxes,
        addOns: updatedAddOns
      };
    });
    
    // Calculate overall totals
    const subtotal = updatedItems.reduce((sum, item) => {
      const addOnTotal = item.addOns.reduce((addOnSum, addon) => addOnSum + addon.cost, 0);
      return sum + item.shippingCost + addOnTotal;
    }, 0);
    
    // Calculate total taxes from shipping and add-ons separately
    const totalTaxes = updatedItems.reduce((sum, item) => {
      const shippingTaxTotal = item.taxes.reduce((taxSum, tax) => taxSum + tax.amount, 0);
      const addOnTaxTotal = item.addOns.reduce((addOnSum, addon) => {
        return addOnSum + addon.taxes.reduce((taxSum, tax) => taxSum + tax.amount, 0);
      }, 0);
      return sum + shippingTaxTotal + addOnTaxTotal;
    }, 0);
    
    const finalData = {
      ...data,
      shippingItems: updatedItems,
      subtotal,
      totalTaxes,
      total: subtotal + totalTaxes
    };
    
    generateShippingPDF(finalData);
    toast({
      title: "Receipt Generated",
      description: `Shipping receipt ${data.receiptNumber} has been downloaded`,
    });
  };

  const onSubmitKey = (data: KeyReceiptData) => {
    // Calculate item totals and subtotal
    const itemsWithTotals = data.keyItems.map(item => ({
      ...item,
      total: item.quantity * item.priceEach
    }));
    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
    
    // Calculate taxes and total
    const calculatedTaxes = calculateTaxes(subtotal, data.taxes);
    const totalTaxes = calculatedTaxes.reduce((sum, tax) => sum + tax.amount, 0);
    
    const finalData = {
      ...data,
      keyItems: itemsWithTotals,
      subtotal,
      taxes: calculatedTaxes,
      total: subtotal + totalTaxes
    };
    
    generateKeyPDF(finalData);
    toast({
      title: "Receipt Generated",
      description: `Key receipt ${data.receiptNumber} has been downloaded`,
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClasses.background}`}>
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse transition-all duration-300 ${themeClasses.backgroundFloating.purple}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000 transition-all duration-300 ${themeClasses.backgroundFloating.blue}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500 transition-all duration-300 ${themeClasses.backgroundFloating.indigo}`}></div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-50 shadow-2xl transition-colors duration-300 ${themeClasses.header}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link 
                to="/staff/dashboard"
                className={`transition-colors mr-4 group ${themeClasses.link}`}
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
                Back to Dashboard
              </Link>
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl">
                <Receipt className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold bg-clip-text text-transparent drop-shadow-lg transition-all duration-300 ${themeClasses.gradient.title}`}>
                  Receipt Generator
                </h1>
                <p className={`text-xs font-medium transition-colors duration-300 ${themeClasses.text.secondary}`}>Staff Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 transition-colors duration-300 ${themeClasses.text.secondary}`}>
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className={`rounded-full px-4 py-2 transition-all duration-300 hover:scale-110 ${themeClasses.button.ghost}`}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 drop-shadow-2xl transition-colors duration-300 ${themeClasses.text.primary}`}>
            Professional Receipt Generator
          </h2>
          <p className={`text-xl max-w-2xl mx-auto drop-shadow-lg transition-colors duration-300 ${themeClasses.text.secondary}`}>
            Create custom PDF receipts for shipping and key cutting services
          </p>
        </div>

        {/* Receipt Type Tabs */}
        <div className={`border rounded-3xl p-8 shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-2 mb-8 backdrop-blur-sm transition-all duration-300 ${themeClasses.card.secondary}`}>
              <TabsTrigger 
                value="shipping" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Package className="h-4 w-4" />
                <span>Shipping Receipt</span>
              </TabsTrigger>
              <TabsTrigger 
                value="key" 
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
              >
                <Key className="h-4 w-4" />
                <span>Key Cutting Receipt</span>
              </TabsTrigger>
            </TabsList>

            {/* Shipping Receipt Form */}
            <TabsContent value="shipping">
              <form onSubmit={shippingForm.handleSubmit(onSubmitShipping)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="receiptNumber" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Receipt Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="receiptNumber"
                        {...shippingForm.register('receiptNumber')}
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateNewReceiptNumber('SH', 'shipping')}
                        className={`px-3 transition-all duration-300 ${themeClasses.button.ghost}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="date" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Date</Label>
                    <Input
                      id="date"
                      type="date"
                      {...shippingForm.register('date')}
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerName" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Name</Label>
                    <Input
                      id="customerName"
                      {...shippingForm.register('customerName')}
                      placeholder="Enter customer name"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      {...shippingForm.register('customerPhone')}
                      placeholder="(403) 555-0123"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold text-lg transition-colors duration-300 ${themeClasses.text.primary}`}>Shipping Items</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const currentItems = shippingForm.getValues('shippingItems') || [];
                        const newItem: ShippingItem = {
                          id: (currentItems.length + 1).toString(),
                          courier: '',
                          trackingNumber: '',
                          destinationCity: '',
                          destinationProvince: 'AB',
                          destinationCountry: 'Canada',
                          shippingCost: 0,
                          addOns: [],
                          taxes: provincialTaxRates['Alberta'].map(tax => ({ ...tax, amount: 0 }))
                        };
                        shippingForm.setValue('shippingItems', [...currentItems, newItem]);
                      }}
                      className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Shipping Item
                    </Button>
                  </div>
                  
                  <div className="space-y-8">
                    {shippingForm.watch('shippingItems')?.map((_, itemIndex) => (
                      <Card key={itemIndex} className={`p-6 ${themeClasses.card.secondary}`}>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className={`font-semibold transition-colors duration-300 ${themeClasses.text.primary}`}>
                            Package {itemIndex + 1}
                          </h4>
                          {shippingForm.watch('shippingItems')?.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentItems = shippingForm.getValues('shippingItems') || [];
                                const newItems = currentItems.filter((_, i) => i !== itemIndex);
                                shippingForm.setValue('shippingItems', newItems);
                              }}
                              className={`transition-all duration-300 ${themeClasses.button.danger}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Courier Service</Label>
                            <Input
                              {...shippingForm.register(`shippingItems.${itemIndex}.courier`)}
                              placeholder="e.g., FedEx Priority Overnight, UPS Ground, Purolator Express"
                              className={`transition-all duration-300 ${themeClasses.input}`}
                            />
                          </div>
                          <div>
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Tracking Number</Label>
                            <Input
                              {...shippingForm.register(`shippingItems.${itemIndex}.trackingNumber`)}
                              placeholder="Enter tracking number"
                              className={`transition-all duration-300 ${themeClasses.input}`}
                            />
                          </div>
                          <div>
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Destination City</Label>
                            <Input
                              {...shippingForm.register(`shippingItems.${itemIndex}.destinationCity`)}
                              placeholder="Enter city"
                              className={`transition-all duration-300 ${themeClasses.input}`}
                            />
                          </div>
                          <div>
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Province/State</Label>
                            <Input
                              {...shippingForm.register(`shippingItems.${itemIndex}.destinationProvince`)}
                              placeholder="AB, BC, ON, CA, etc."
                              defaultValue="AB"
                              className={`transition-all duration-300 ${themeClasses.input}`}
                            />
                          </div>
                          <div>
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Country</Label>
                            <Input
                              {...shippingForm.register(`shippingItems.${itemIndex}.destinationCountry`)}
                              placeholder="Canada, USA, etc."
                              defaultValue="Canada"
                              className={`transition-all duration-300 ${themeClasses.input}`}
                            />
                          </div>
                          <div>
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Shipping Cost ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              {...shippingForm.register(`shippingItems.${itemIndex}.shippingCost`, { valueAsNumber: true })}
                              placeholder="0.00"
                              className={`transition-all duration-300 ${themeClasses.input}`}
                            />
                          </div>
                        </div>
                        
                        {/* Add-ons section */}
                        <div className="mt-6">
                          <div className="flex justify-between items-center mb-3">
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Add-ons</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentAddOns = shippingForm.getValues(`shippingItems.${itemIndex}.addOns`) || [];
                                const newAddOn: ShippingAddOn = {
                                  type: 'Small Box',
                                  cost: 5,
                                  taxes: provincialTaxRates['Alberta'].map(tax => ({ ...tax, amount: 0 }))
                                };
                                shippingForm.setValue(`shippingItems.${itemIndex}.addOns`, [...currentAddOns, newAddOn]);
                              }}
                              className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {shippingForm.watch(`shippingItems.${itemIndex}.addOns`)?.map((_, addonIndex) => (
                              <div key={addonIndex} className="grid grid-cols-3 gap-2 items-end">
                                <div>
                                  <Label className={`text-sm font-medium ${themeClasses.text.primary}`}>Add-on Type</Label>
                                  <Select 
                                    onValueChange={(value) => {
                                      const addon = shippingAddOns.find(a => a.type === value);
                                      if (addon) {
                                        shippingForm.setValue(`shippingItems.${itemIndex}.addOns.${addonIndex}.type`, value);
                                        shippingForm.setValue(`shippingItems.${itemIndex}.addOns.${addonIndex}.cost`, addon.cost);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className={`h-8 text-sm ${themeClasses.input}`}>
                                      <SelectValue placeholder="Select add-on" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {shippingAddOns.map(addon => (
                                        <SelectItem key={addon.type} value={addon.type}>
                                          {addon.type}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {shippingForm.watch(`shippingItems.${itemIndex}.addOns.${addonIndex}.type`) === 'Custom' && (
                                  <div>
                                    <Label className={`text-sm font-medium ${themeClasses.text.primary}`}>Custom Name</Label>
                                    <Input
                                      {...shippingForm.register(`shippingItems.${itemIndex}.addOns.${addonIndex}.customName`)}
                                      placeholder="Custom item name"
                                      className={`h-8 text-sm ${themeClasses.input}`}
                                    />
                                  </div>
                                )}
                                
                                <div className="flex gap-1">
                                  <div className="flex-1">
                                    <Label className={`text-sm font-medium ${themeClasses.text.primary}`}>Price ($)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      {...shippingForm.register(`shippingItems.${itemIndex}.addOns.${addonIndex}.cost`, { valueAsNumber: true })}
                                      placeholder="0.00"
                                      className={`h-8 text-sm ${themeClasses.input}`}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const currentAddOns = shippingForm.getValues(`shippingItems.${itemIndex}.addOns`) || [];
                                      const newAddOns = currentAddOns.filter((_, i) => i !== addonIndex);
                                      shippingForm.setValue(`shippingItems.${itemIndex}.addOns`, newAddOns);
                                    }}
                                    className={`h-8 px-2 mt-5 ${themeClasses.button.danger}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                {/* Add-on specific taxes */}
                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                  <div className="flex justify-between items-center mb-2">
                                    <Label className={`text-sm font-medium ${themeClasses.text.primary}`}>Add-on Taxes</Label>
                                    <div className="flex gap-2">
                                      <Select onValueChange={(province) => {
                                        const taxes = provincialTaxRates[province as keyof typeof provincialTaxRates] || provincialTaxRates['Alberta'];
                                        const taxesWithAmount = taxes.map(tax => ({ ...tax, amount: 0 }));
                                        shippingForm.setValue(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`, taxesWithAmount);
                                      }}>
                                        <SelectTrigger className={`w-32 h-7 text-xs ${themeClasses.input}`}>
                                          <SelectValue placeholder="Alberta" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Object.keys(provincialTaxRates).map(province => (
                                            <SelectItem key={province} value={province}>{province}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const currentTaxes = shippingForm.getValues(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`) || [];
                                          shippingForm.setValue(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`, [...currentTaxes, { name: '', percentage: 0, amount: 0 }]);
                                        }}
                                        className={`h-7 px-2 text-xs ${themeClasses.button.ghost}`}
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    {shippingForm.watch(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`)?.map((_, taxIndex) => (
                                      <div key={taxIndex} className="grid grid-cols-3 gap-2 items-center">
                                        <Input
                                          {...shippingForm.register(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes.${taxIndex}.name`)}
                                          placeholder="Tax name"
                                          className={`h-7 text-xs ${themeClasses.input}`}
                                        />
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...shippingForm.register(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes.${taxIndex}.percentage`, { valueAsNumber: true })}
                                          placeholder="%"
                                          className={`h-7 text-xs ${themeClasses.input}`}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const currentTaxes = shippingForm.getValues(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`) || [];
                                            const newTaxes = currentTaxes.filter((_, i) => i !== taxIndex);
                                            shippingForm.setValue(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`, newTaxes);
                                          }}
                                          className={`h-7 px-2 ${themeClasses.button.danger}`}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Shipping taxes section */}
                        <div className="mt-6">
                          <div className="flex justify-between items-center mb-3">
                            <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Shipping Taxes</Label>
                            <div className="flex gap-2">
                              <Select onValueChange={(province) => setProvincialTax(province, 'shipping', itemIndex)}>
                                <SelectTrigger className={`w-32 h-8 text-sm ${themeClasses.input}`}>
                                  <SelectValue placeholder="Alberta" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(provincialTaxRates).map(province => (
                                    <SelectItem key={province} value={province}>{province}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const currentTaxes = shippingForm.getValues(`shippingItems.${itemIndex}.taxes`) || [];
                                  shippingForm.setValue(`shippingItems.${itemIndex}.taxes`, [...currentTaxes, { name: '', percentage: 0, amount: 0 }]);
                                }}
                                className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Tax
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {shippingForm.watch(`shippingItems.${itemIndex}.taxes`)?.map((_, taxIndex) => (
                              <div key={taxIndex} className="grid grid-cols-3 gap-2 items-end">
                                <Input
                                  {...shippingForm.register(`shippingItems.${itemIndex}.taxes.${taxIndex}.name`)}
                                  placeholder="Tax name"
                                  className={`h-8 text-sm ${themeClasses.input}`}
                                />
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...shippingForm.register(`shippingItems.${itemIndex}.taxes.${taxIndex}.percentage`, { valueAsNumber: true })}
                                  placeholder="%"
                                  className={`h-8 text-sm ${themeClasses.input}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentTaxes = shippingForm.getValues(`shippingItems.${itemIndex}.taxes`) || [];
                                    const newTaxes = currentTaxes.filter((_, i) => i !== taxIndex);
                                    shippingForm.setValue(`shippingItems.${itemIndex}.taxes`, newTaxes);
                                  }}
                                  className={`h-8 px-2 ${themeClasses.button.danger}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className={`w-full h-12 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Generate Shipping Receipt PDF
                </Button>
              </form>
            </TabsContent>

            {/* Key Cutting Receipt Form */}
            <TabsContent value="key">
              <form onSubmit={keyForm.handleSubmit(onSubmitKey)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="keyReceiptNumber" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Receipt Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="keyReceiptNumber"
                        {...keyForm.register('receiptNumber')}
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateNewReceiptNumber('KEY', 'key')}
                        className={`px-3 transition-all duration-300 ${themeClasses.button.ghost}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="keyDate" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Date</Label>
                    <Input
                      id="keyDate"
                      type="date"
                      {...keyForm.register('date')}
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="keyCustomerName" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Name</Label>
                    <Input
                      id="keyCustomerName"
                      {...keyForm.register('customerName')}
                      placeholder="Enter customer name"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="keyCustomerPhone" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Phone</Label>
                    <Input
                      id="keyCustomerPhone"
                      {...keyForm.register('customerPhone')}
                      placeholder="(403) 555-0123"
                      className={`transition-all duration-300 ${themeClasses.input}`}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className={`font-bold text-lg mb-4 transition-colors duration-300 ${themeClasses.text.primary}`}>Key Items</h3>
                  <div className="space-y-4">
                    {keyForm.watch('keyItems')?.map((_, index) => (
                      <div key={index} className="grid grid-cols-4 gap-4 items-end">
                        <div>
                          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Key Model</Label>
                          <Input
                            {...keyForm.register(`keyItems.${index}.model`)}
                            placeholder="House Key, Mailbox, etc."
                            className={`transition-all duration-300 ${themeClasses.input}`}
                          />
                        </div>
                        <div>
                          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            {...keyForm.register(`keyItems.${index}.quantity`, { valueAsNumber: true })}
                            className={`transition-all duration-300 ${themeClasses.input}`}
                          />
                        </div>
                        <div>
                          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Price Each ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...keyForm.register(`keyItems.${index}.priceEach`, { valueAsNumber: true })}
                            placeholder="0.00"
                            className={`transition-all duration-300 ${themeClasses.input}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentItems = keyForm.getValues('keyItems') || [];
                            const newItems = currentItems.filter((_, i) => i !== index);
                            keyForm.setValue('keyItems', newItems.length > 0 ? newItems : [{ model: '', quantity: 1, priceEach: 0, total: 0 }]);
                          }}
                          className={`transition-all duration-300 ${themeClasses.button.danger}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const currentItems = keyForm.getValues('keyItems') || [];
                        keyForm.setValue('keyItems', [...currentItems, { model: '', quantity: 1, priceEach: 0, total: 0 }]);
                      }}
                      className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key Item
                    </Button>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`font-bold text-lg transition-colors duration-300 ${themeClasses.text.primary}`}>Taxes</h3>
                    <div className="flex gap-2">
                      <Select onValueChange={(province) => setProvincialTax(province, 'key')}>
                        <SelectTrigger className={`w-20 h-8 text-sm ${themeClasses.input}`}>
                          <SelectValue placeholder="Alberta" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(provincialTaxRates).map(province => (
                            <SelectItem key={province} value={province}>{province}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentTaxes = keyForm.getValues('taxes') || [];
                          keyForm.setValue('taxes', [...currentTaxes, { name: '', percentage: 0, amount: 0 }]);
                        }}
                        className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tax
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {keyForm.watch('taxes')?.map((_, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 items-end">
                        <div>
                          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Tax Name</Label>
                          <Input
                            {...keyForm.register(`taxes.${index}.name`)}
                            placeholder="GST, HST, PST, etc."
                            className={`transition-all duration-300 ${themeClasses.input}`}
                          />
                        </div>
                        <div>
                          <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...keyForm.register(`taxes.${index}.percentage`, { valueAsNumber: true })}
                            placeholder="5.00"
                            className={`transition-all duration-300 ${themeClasses.input}`}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentTaxes = keyForm.getValues('taxes') || [];
                            const newTaxes = currentTaxes.filter((_, i) => i !== index);
                            keyForm.setValue('taxes', newTaxes);
                          }}
                          className={`transition-all duration-300 ${themeClasses.button.danger}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className={`w-full h-12 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.secondary}`}
                >
                  <Download className="h-5 w-5 mr-2" />
                  Generate Key Receipt PDF
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default StaffReceipts;