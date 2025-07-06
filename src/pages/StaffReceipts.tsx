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
  ArrowLeft, 
  Printer, 
  User, 
  LogOut, 
  Receipt, 
  Package, 
  Key,
  Download,
  Plus,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface ShippingReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerPhone: string;
  courier: string;
  trackingNumber: string;
  destinationCity: string;
  destinationProvince: string;
  destinationCountry: string;
  subtotal: number;
  taxes: { name: string; percentage: number; amount: number }[];
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

const StaffReceipts = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("shipping");
  
  const shippingForm = useForm<ShippingReceiptData>({
    defaultValues: {
      receiptNumber: `SH-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      taxes: [{ name: 'GST', percentage: 5, amount: 0 }]
    }
  });

  const keyForm = useForm<KeyReceiptData>({
    defaultValues: {
      receiptNumber: `KEY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      keyItems: [{ model: '', quantity: 1, priceEach: 0, total: 0 }],
      taxes: [{ name: 'GST', percentage: 5, amount: 0 }]
    }
  });

  const handleLogout = async () => {
    await logout();
  };

  const calculateTaxes = (subtotal: number, taxes: { name: string; percentage: number; amount: number }[]) => {
    return taxes.map(tax => ({
      ...tax,
      amount: (subtotal * tax.percentage) / 100
    }));
  };

  const generateShippingPDF = (data: ShippingReceiptData) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header with business name and colors
    pdf.setFillColor(34, 87, 149); // Blue
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INK, TONER, & MOORE', 20, 16);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Professional Office Services', 20, 21);
    
    // Orange accent line
    pdf.setFillColor(255, 140, 0); // Orange
    pdf.rect(0, 25, pageWidth, 2, 'F');
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
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
    // TODO: Add GST/HST number here
    pdf.text('GST/HST #: [TODO: Add business number]', 20, 65);
    
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
    
    // Shipping details section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SHIPPING DETAILS', 20, 110);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Courier: ${data.courier}`, 20, 120);
    pdf.text(`Tracking Number: ${data.trackingNumber}`, 20, 125);
    pdf.text(`Destination: ${data.destinationCity}, ${data.destinationProvince}, ${data.destinationCountry}`, 20, 130);
    
    // Pricing section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CHARGES', 20, 150);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    let yPos = 160;
    pdf.text(`Subtotal:`, 20, yPos);
    pdf.text(`$${data.subtotal.toFixed(2)}`, 150, yPos);
    
    // Taxes
    data.taxes.forEach(tax => {
      yPos += 8;
      pdf.text(`${tax.name} (${tax.percentage}%):`, 20, yPos);
      pdf.text(`$${tax.amount.toFixed(2)}`, 150, yPos);
    });
    
    // Total with orange background
    yPos += 12;
    pdf.setFillColor(255, 140, 0, 0.1); // Light orange
    pdf.rect(15, yPos - 5, 160, 10, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL:`, 20, yPos);
    pdf.text(`$${data.total.toFixed(2)}`, 150, yPos);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Thank you for choosing Ink, Toner, & Moore!', 20, 280);
    pdf.text('Located in Westbrook Mall - Your trusted office services provider', 20, 285);
    
    // Save the PDF
    pdf.save(`shipping-receipt-${data.receiptNumber}.pdf`);
  };

  const generateKeyPDF = (data: KeyReceiptData) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header with business name and colors
    pdf.setFillColor(34, 87, 149); // Blue
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INK, TONER, & MOORE', 20, 16);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Professional Office Services', 20, 21);
    
    // Orange accent line
    pdf.setFillColor(255, 140, 0); // Orange
    pdf.rect(0, 25, pageWidth, 2, 'F');
    
    // Reset text color
    pdf.setTextColor(0, 0, 0);
    
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
    // TODO: Add GST/HST number here
    pdf.text('GST/HST #: [TODO: Add business number]', 20, 65);
    
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
    
    // Total with orange background
    yPos += 12;
    pdf.setFillColor(255, 140, 0, 0.1); // Light orange
    pdf.rect(95, yPos - 5, 80, 10, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL:`, 100, yPos);
    pdf.text(`$${data.total.toFixed(2)}`, 140, yPos);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Thank you for choosing Ink, Toner, & Moore!', 20, 280);
    pdf.text('Located in Westbrook Mall - Your trusted office services provider', 20, 285);
    
    // Save the PDF
    pdf.save(`key-receipt-${data.receiptNumber}.pdf`);
  };

  const onSubmitShipping = (data: ShippingReceiptData) => {
    // Calculate taxes and total
    const calculatedTaxes = calculateTaxes(data.subtotal, data.taxes);
    const totalTaxes = calculatedTaxes.reduce((sum, tax) => sum + tax.amount, 0);
    const finalData = {
      ...data,
      taxes: calculatedTaxes,
      total: data.subtotal + totalTaxes
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900">
      {/* Background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="backdrop-blur-xl bg-white/10 border-b border-white/20 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Link 
                to="/staff/dashboard"
                className="text-blue-200 hover:text-white transition-colors mr-4 group"
              >
                <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform inline mr-2" />
                Back to Dashboard
              </Link>
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-3 rounded-xl shadow-2xl">
                <Receipt className="h-8 w-8 text-white drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100 drop-shadow-lg">
                  Receipt Generator
                </h1>
                <p className="text-xs font-medium text-blue-200">Staff Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-blue-200">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.email}</span>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 transition-all duration-300 hover:scale-110"
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
          <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-2xl">
            Professional Receipt Generator
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto drop-shadow-lg">
            Create custom PDF receipts for shipping and key cutting services
          </p>
        </div>

        {/* Receipt Type Tabs */}
        <div className="backdrop-blur-xl bg-white/15 border-white/30 border rounded-3xl p-8 shadow-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/20 backdrop-blur-sm">
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
                    <Label htmlFor="receiptNumber" className="text-white font-medium">Receipt Number</Label>
                    <Input
                      id="receiptNumber"
                      {...shippingForm.register('receiptNumber')}
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="text-white font-medium">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      {...shippingForm.register('date')}
                      className="bg-white/10 border-white/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerName" className="text-white font-medium">Customer Name</Label>
                    <Input
                      id="customerName"
                      {...shippingForm.register('customerName')}
                      placeholder="Enter customer name"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone" className="text-white font-medium">Customer Phone</Label>
                    <Input
                      id="customerPhone"
                      {...shippingForm.register('customerPhone')}
                      placeholder="(403) 555-0123"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="courier" className="text-white font-medium">Courier</Label>
                    <Select onValueChange={(value) => shippingForm.setValue('courier', value)}>
                      <SelectTrigger className="bg-white/10 border-white/30 text-white">
                        <SelectValue placeholder="Select courier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                        <SelectItem value="Purolator">Purolator</SelectItem>
                        <SelectItem value="Canada Post">Canada Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="trackingNumber" className="text-white font-medium">Tracking Number</Label>
                    <Input
                      id="trackingNumber"
                      {...shippingForm.register('trackingNumber')}
                      placeholder="Enter tracking number"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="destinationCity" className="text-white font-medium">Destination City</Label>
                    <Input
                      id="destinationCity"
                      {...shippingForm.register('destinationCity')}
                      placeholder="Enter city"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="destinationProvince" className="text-white font-medium">Province/State</Label>
                    <Input
                      id="destinationProvince"
                      {...shippingForm.register('destinationProvince')}
                      placeholder="AB, BC, CA, etc."
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="destinationCountry" className="text-white font-medium">Country</Label>
                    <Input
                      id="destinationCountry"
                      {...shippingForm.register('destinationCountry')}
                      placeholder="Canada, USA, etc."
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subtotal" className="text-white font-medium">Subtotal ($)</Label>
                    <Input
                      id="subtotal"
                      type="number"
                      step="0.01"
                      {...shippingForm.register('subtotal', { valueAsNumber: true })}
                      placeholder="0.00"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-white font-bold text-lg mb-4">Taxes</h3>
                  <div className="space-y-4">
                    {shippingForm.watch('taxes')?.map((_, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 items-end">
                        <div>
                          <Label className="text-white font-medium">Tax Name</Label>
                          <Input
                            {...shippingForm.register(`taxes.${index}.name`)}
                            placeholder="GST, HST, PST, etc."
                            className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                          />
                        </div>
                        <div>
                          <Label className="text-white font-medium">Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...shippingForm.register(`taxes.${index}.percentage`, { valueAsNumber: true })}
                            placeholder="5.00"
                            className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const currentTaxes = shippingForm.getValues('taxes') || [];
                            const newTaxes = currentTaxes.filter((_, i) => i !== index);
                            shippingForm.setValue('taxes', newTaxes);
                          }}
                          className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const currentTaxes = shippingForm.getValues('taxes') || [];
                        shippingForm.setValue('taxes', [...currentTaxes, { name: '', percentage: 0, amount: 0 }]);
                      }}
                      className="text-blue-200 hover:text-white hover:bg-blue-500/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tax
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
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
                    <Label htmlFor="keyReceiptNumber" className="text-white font-medium">Receipt Number</Label>
                    <Input
                      id="keyReceiptNumber"
                      {...keyForm.register('receiptNumber')}
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="keyDate" className="text-white font-medium">Date</Label>
                    <Input
                      id="keyDate"
                      type="date"
                      {...keyForm.register('date')}
                      className="bg-white/10 border-white/30 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="keyCustomerName" className="text-white font-medium">Customer Name</Label>
                    <Input
                      id="keyCustomerName"
                      {...keyForm.register('customerName')}
                      placeholder="Enter customer name"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="keyCustomerPhone" className="text-white font-medium">Customer Phone</Label>
                    <Input
                      id="keyCustomerPhone"
                      {...keyForm.register('customerPhone')}
                      placeholder="(403) 555-0123"
                      className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-white font-bold text-lg mb-4">Key Items</h3>
                  <div className="space-y-4">
                    {keyForm.watch('keyItems')?.map((_, index) => (
                      <div key={index} className="grid grid-cols-4 gap-4 items-end">
                        <div>
                          <Label className="text-white font-medium">Key Model</Label>
                          <Input
                            {...keyForm.register(`keyItems.${index}.model`)}
                            placeholder="House Key, Mailbox, etc."
                            className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                          />
                        </div>
                        <div>
                          <Label className="text-white font-medium">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            {...keyForm.register(`keyItems.${index}.quantity`, { valueAsNumber: true })}
                            className="bg-white/10 border-white/30 text-white"
                          />
                        </div>
                        <div>
                          <Label className="text-white font-medium">Price Each ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...keyForm.register(`keyItems.${index}.priceEach`, { valueAsNumber: true })}
                            placeholder="0.00"
                            className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
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
                          className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
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
                      className="text-orange-200 hover:text-white hover:bg-orange-500/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key Item
                    </Button>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-white font-bold text-lg mb-4">Taxes</h3>
                  <div className="space-y-4">
                    {keyForm.watch('taxes')?.map((_, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 items-end">
                        <div>
                          <Label className="text-white font-medium">Tax Name</Label>
                          <Input
                            {...keyForm.register(`taxes.${index}.name`)}
                            placeholder="GST, HST, PST, etc."
                            className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
                          />
                        </div>
                        <div>
                          <Label className="text-white font-medium">Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...keyForm.register(`taxes.${index}.percentage`, { valueAsNumber: true })}
                            placeholder="5.00"
                            className="bg-white/10 border-white/30 text-white placeholder:text-blue-200"
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
                          className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        const currentTaxes = keyForm.getValues('taxes') || [];
                        keyForm.setValue('taxes', [...currentTaxes, { name: '', percentage: 0, amount: 0 }]);
                      }}
                      className="text-orange-200 hover:text-white hover:bg-orange-500/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tax
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 border border-white/30"
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