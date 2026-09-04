import { useState } from "react";
import { Link } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt,
  Package,
  Key,
  Printer,
  Droplets,
  Box,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  User,
  LogOut,
  RefreshCw
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useAiMode } from "@/ai/context";
import type { CartLine } from "@/ai/cart";
import { packingToCartLine } from "@/ai/actions/cartLines";
import {
  PACKING_PRESETS,
  aggregatePackingTax,
  emptyPackingItem,
  packingLineTotal,
  packingSubtotal,
  type PackingItem,
} from "@/lib/packing";
import StaffLayout from "@/components/StaffLayout";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import GstBreakdown from "@/components/GstBreakdown";
import CartridgeLineFields from "@/components/CartridgeLineFields";
import {
  GST_RATE,
  generateReceiptNumber,
  round2,
} from "@/lib/simpleReceipt";
import {
  CartridgeLine,
  cartridgesSubtotal,
  describeCartridge,
  emptyCartridgeLine,
  isFilledNumber,
} from "@/lib/cartridges";

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

interface CartridgeFormData {
  receiptNumber: string;
  date: string; // yyyy-mm-dd
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  cartridges: CartridgeLine[];
  notes: string;
}

interface TonerLine {
  model: string;
  price?: number;
}

interface TonerFormData {
  receiptNumber: string;
  date: string; // yyyy-mm-dd
  customerName: string;
  customerPhone: string;
  toners: TonerLine[];
}

const emptyTonerLine = (): TonerLine => ({ model: '', price: undefined });

const tonersSubtotal = (lines: TonerLine[]) =>
  round2(lines.reduce((sum, line) => sum + (isFilledNumber(line.price) ? line.price : 0), 0));

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

let receiptCartLineId = 0;
const nextCartLineId = () => `sr-${(receiptCartLineId += 1)}`;

const StaffReceipts = () => {
  const { user, logout } = useAuth();
  const { addCartLines } = useAiMode();
  const { themeClasses, isDarkMode } = useTheme();
  // The app's dialogs/inputs render against the light shadcn palette, so in dark
  // mode the default checkbox (dark border, dark fill) nearly vanishes — invert it.
  const checkboxClass = isDarkMode
    ? "border-gray-300 data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
    : "";
  const [activeTab, setActiveTab] = useState("shipping");
  const [packingRows, setPackingRows] = useState<(PackingItem & { id: string })[]>([]);
  const [packingCustomName, setPackingCustomName] = useState("");
  const [packingCustomCost, setPackingCustomCost] = useState("");
  
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

  const today = new Date().toISOString().split('T')[0];

  const cartridgeForm = useForm<CartridgeFormData>({
    defaultValues: {
      receiptNumber: generateReceiptNumber('CR'),
      date: today,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      cartridges: [emptyCartridgeLine()],
      notes: '',
    },
  });
  // GST applies to almost every sale, so it's on unless staff opt out.
  const [cartridgeAddGst, setCartridgeAddGst] = useState(true);
  const cartridgeSubtotal = cartridgesSubtotal(cartridgeForm.watch('cartridges') ?? []);

  const tonerForm = useForm<TonerFormData>({
    defaultValues: {
      receiptNumber: generateReceiptNumber('TON'),
      date: today,
      customerName: '',
      customerPhone: '',
      toners: [emptyTonerLine()],
    },
  });
  const tonerLines = useFieldArray({ control: tonerForm.control, name: 'toners' });
  const [tonerAddGst, setTonerAddGst] = useState(true);
  const tonerSubtotal = tonersSubtotal(tonerForm.watch('toners') ?? []);

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

  // Add the current tab's items to the open receipt instead of downloading now.
  // Same open receipt the Packing tab and the chat feed; Finish prints it. A
  // single item is just a one-item receipt.
  const gstLine = (price: number) => [{ label: `GST (${(GST_RATE * 100).toFixed(0)}%)`, amount: round2(price * GST_RATE) }];
  const addedToast = () =>
    toast({ title: "Added to the receipt", description: "It is on the open receipt panel. Finish it when ready." });

  const addCartridgeToReceipt = () => {
    const data = cartridgeForm.getValues();
    const lines: CartLine[] = (data.cartridges || [])
      .filter((c) => isFilledNumber(c.price))
      .map((c) => {
        const price = round2(c.price as number);
        return {
          id: nextCartLineId(),
          description: describeCartridge(c),
          price,
          taxLines: cartridgeAddGst ? gstLine(price) : [],
          source: "refill" as const,
        };
      });
    if (!lines.length) {
      toast({ title: "Add a cartridge with a price first", variant: "destructive" });
      return;
    }
    addCartLines(lines);
    addedToast();
  };

  const addTonerToReceipt = () => {
    const data = tonerForm.getValues();
    const lines: CartLine[] = (data.toners || [])
      .filter((t) => isFilledNumber(t.price))
      .map((t) => {
        const price = round2(t.price as number);
        return {
          id: nextCartLineId(),
          description: t.model || "Toner",
          price,
          taxLines: tonerAddGst ? gstLine(price) : [],
          source: "supplies" as const,
        };
      });
    if (!lines.length) {
      toast({ title: "Add a toner with a price first", variant: "destructive" });
      return;
    }
    addCartLines(lines);
    addedToast();
  };

  const addShippingToReceipt = () => {
    const data = shippingForm.getValues();
    const lines: CartLine[] = [];
    const taxToLines = (cost: number, taxes: { name: string; percentage: number }[]) =>
      calculateTaxes(cost, (taxes || []).map((t) => ({ ...t, amount: 0 })))
        .filter((t) => t.name && t.percentage)
        .map((t) => ({ label: `${t.name} (${t.percentage}%)`, amount: round2(t.amount) }));

    (data.shippingItems || []).forEach((item) => {
      const dest = [item.destinationCity, item.destinationProvince, item.destinationCountry]
        .filter(Boolean)
        .join(", ");
      if (isFilledNumber(item.shippingCost) || (item.courier && item.courier.trim())) {
        const price = round2(item.shippingCost || 0);
        lines.push({
          id: nextCartLineId(),
          description: [item.courier?.trim() || "Shipment", dest ? `To: ${dest}` : ""].filter(Boolean).join("\n"),
          price,
          taxLines: taxToLines(price, item.taxes),
          source: "shipping",
        });
      }
      (item.addOns || []).forEach((addon) => {
        const name = addon.type === "Custom" ? addon.customName || "Add-on" : addon.type;
        const price = round2(addon.cost || 0);
        lines.push({
          id: nextCartLineId(),
          description: name,
          price,
          taxLines: taxToLines(price, addon.taxes),
          source: "shipping",
        });
      });
    });
    if (!lines.length) {
      toast({ title: "Add a shipment with a courier and cost first", variant: "destructive" });
      return;
    }
    addCartLines(lines);
    addedToast();
  };

  const addKeyToReceipt = () => {
    const data = keyForm.getValues();
    const lines: CartLine[] = (data.keyItems || [])
      .filter((k) => k.model?.trim() && isFilledNumber(k.priceEach))
      .map((k) => {
        const qty = k.quantity || 1;
        const price = round2((k.priceEach || 0) * qty);
        return {
          id: nextCartLineId(),
          description: qty > 1 ? `${k.model} x${qty}` : k.model,
          price,
          taxLines: (data.taxes || [])
            .filter((t) => t.name && t.percentage)
            .map((t) => ({ label: `${t.name} (${t.percentage}%)`, amount: round2((price * t.percentage) / 100) })),
          source: "supplies" as const,
        };
      });
    if (!lines.length) {
      toast({ title: "Add a key with a price first", variant: "destructive" });
      return;
    }
    addCartLines(lines);
    addedToast();
  };

  // Packing tab: local rows of supplies before they go on the open receipt.
  const addPackingPreset = (name: string, cost: number) =>
    setPackingRows((prev) => [...prev, { ...emptyPackingItem(), id: nextCartLineId(), name, cost }]);
  const addPackingCustom = () => {
    const name = packingCustomName.trim();
    const cost = Number(packingCustomCost);
    if (!name || !Number.isFinite(cost) || cost < 0) {
      toast({ title: "Add a name and a valid price", variant: "destructive" });
      return;
    }
    setPackingRows((prev) => [...prev, { ...emptyPackingItem(), id: nextCartLineId(), name, cost }]);
    setPackingCustomName("");
    setPackingCustomCost("");
  };
  const patchPackingRow = (id: string, next: Partial<PackingItem>) =>
    setPackingRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  const removePackingRow = (id: string) => setPackingRows((prev) => prev.filter((r) => r.id !== id));
  const addPackingToReceipt = () => {
    if (packingRows.length === 0) return;
    addCartLines(packingRows.map((r) => packingToCartLine(r)));
    addedToast();
    setPackingRows([]);
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
              <ThemeToggleButton />
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
            Create custom PDF receipts for shipping, key cutting, cartridge refills, and toner sales
          </p>
        </div>

        {/* Receipt Type Tabs */}
        <div className={`border rounded-3xl p-8 shadow-2xl transition-all duration-300 ${themeClasses.card.primary}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full grid-cols-2 md:grid-cols-5 gap-2 mb-8 h-auto backdrop-blur-sm transition-all duration-300 ${themeClasses.card.secondary}`}>
              <TabsTrigger
                value="shipping"
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Package className="h-4 w-4" />
                <span>Shipping</span>
              </TabsTrigger>
              <TabsTrigger
                value="key"
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
              >
                <Key className="h-4 w-4" />
                <span>Key Cutting</span>
              </TabsTrigger>
              <TabsTrigger
                value="cartridge"
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Printer className="h-4 w-4" />
                <span>Cartridge Refill</span>
              </TabsTrigger>
              <TabsTrigger
                value="toner"
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white"
              >
                <Droplets className="h-4 w-4" />
                <span>Toner Sale</span>
              </TabsTrigger>
              <TabsTrigger
                value="packing"
                className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
              >
                <Box className="h-4 w-4" />
                <span>Packing</span>
              </TabsTrigger>
            </TabsList>

            {/* Shipping Receipt Form */}
            <TabsContent value="shipping">
              <form onSubmit={shippingForm.handleSubmit(addShippingToReceipt)} className="space-y-6">
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
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </form>
            </TabsContent>

            {/* Key Cutting Receipt Form */}
            <TabsContent value="key">
              <form onSubmit={keyForm.handleSubmit(addKeyToReceipt)} className="space-y-6">
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
                  className={`w-full h-12 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </form>
            </TabsContent>

            {/* Cartridge Refill Receipt Form */}
            <TabsContent value="cartridge">
              <form onSubmit={cartridgeForm.handleSubmit(addCartridgeToReceipt)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="crReceiptNumber" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Receipt Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="crReceiptNumber"
                        {...cartridgeForm.register('receiptNumber')}
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => cartridgeForm.setValue('receiptNumber', generateReceiptNumber('CR'))}
                        className={`px-3 transition-all duration-300 ${themeClasses.button.ghost}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="crDate" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Date</Label>
                    <Input id="crDate" type="date" {...cartridgeForm.register('date')} className={`transition-all duration-300 ${themeClasses.input}`} />
                  </div>
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Name</Label>
                    <Input {...cartridgeForm.register('customerName')} placeholder="Enter customer name" className={`transition-all duration-300 ${themeClasses.input}`} />
                  </div>
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Phone</Label>
                    <Input {...cartridgeForm.register('customerPhone')} placeholder="(403) 555-0123" className={`transition-all duration-300 ${themeClasses.input}`} />
                  </div>
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Email</Label>
                    <Input type="email" {...cartridgeForm.register('customerEmail')} placeholder="customer@email.com" className={`transition-all duration-300 ${themeClasses.input}`} />
                  </div>
                </div>

                <CartridgeLineFields
                  form={cartridgeForm}
                  themeClasses={themeClasses}
                  requirePrice
                />
                {cartridgeForm.formState.errors.cartridges && (
                  <p className="text-sm text-red-500">Every cartridge needs a model and a valid price.</p>
                )}

                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer select-none transition-colors duration-300 ${themeClasses.text.primary}`}>
                    <Checkbox checked={cartridgeAddGst} onCheckedChange={(c) => setCartridgeAddGst(c === true)} className={checkboxClass} />
                    Add GST ({(GST_RATE * 100).toFixed(0)}%)
                  </label>
                  {cartridgeAddGst && cartridgeSubtotal > 0 && (
                    <GstBreakdown price={cartridgeSubtotal} />
                  )}
                </div>

                <div>
                  <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Notes</Label>
                  <Textarea rows={2} {...cartridgeForm.register('notes')} placeholder="Any special notes" className={`transition-all duration-300 ${themeClasses.input}`} />
                </div>

                <p className={`text-sm ${themeClasses.text.muted}`}>Blank fields are left off the printed receipt.</p>

                <Button
                  type="submit"
                  className={`w-full h-12 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </form>
            </TabsContent>

            {/* Toner Sale Receipt Form */}
            <TabsContent value="toner">
              <form onSubmit={tonerForm.handleSubmit(addTonerToReceipt)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="tonReceiptNumber" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Receipt Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="tonReceiptNumber"
                        {...tonerForm.register('receiptNumber')}
                        className={`transition-all duration-300 ${themeClasses.input}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => tonerForm.setValue('receiptNumber', generateReceiptNumber('TON'))}
                        className={`px-3 transition-all duration-300 ${themeClasses.button.ghost}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="tonDate" className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Date</Label>
                    <Input id="tonDate" type="date" {...tonerForm.register('date')} className={`transition-all duration-300 ${themeClasses.input}`} />
                  </div>
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Name</Label>
                    <Input {...tonerForm.register('customerName')} placeholder="Optional" className={`transition-all duration-300 ${themeClasses.input}`} />
                  </div>
                  <div>
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Customer Phone</Label>
                    <Input {...tonerForm.register('customerPhone')} placeholder="Optional" className={`transition-all duration-300 ${themeClasses.input}`} />
                  </div>
                </div>

                {/* Toners — one line per toner sold, so a single sale can cover several. */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>Toners</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => tonerLines.append(emptyTonerLine())}
                      className={`transition-all duration-300 ${themeClasses.button.ghost}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Toner
                    </Button>
                  </div>

                  {tonerLines.fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                      <div>
                        <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
                          Model <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          {...tonerForm.register(`toners.${index}.model`, { required: 'Model is required' })}
                          placeholder="e.g. HP 26A, Brother TN660"
                          className={`transition-all duration-300 ${themeClasses.input}`}
                        />
                      </div>
                      <div>
                        <Label className={`font-medium transition-colors duration-300 ${themeClasses.text.primary}`}>
                          Price ($) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter the sale price"
                          {...tonerForm.register(`toners.${index}.price`, {
                            valueAsNumber: true,
                            validate: (v) => (isFilledNumber(v) && v >= 0) || 'A valid price is required',
                          })}
                          className={`transition-all duration-300 ${themeClasses.input}`}
                        />
                      </div>
                      {tonerLines.fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => tonerLines.remove(index)}
                          className={`transition-all duration-300 ${themeClasses.button.danger}`}
                          title="Remove this toner"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {tonerForm.formState.errors.toners && (
                    <p className="text-sm text-red-500">Every toner needs a model and a valid price.</p>
                  )}

                  {/* Only worth showing once there's more than one line to add up. */}
                  {tonerLines.fields.length > 1 && (
                    <div className={`flex justify-between text-sm font-semibold transition-colors duration-300 ${themeClasses.text.primary}`}>
                      <span>Subtotal</span>
                      <span>${tonerSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer select-none transition-colors duration-300 ${themeClasses.text.primary}`}>
                    <Checkbox checked={tonerAddGst} onCheckedChange={(c) => setTonerAddGst(c === true)} className={checkboxClass} />
                    Add GST ({(GST_RATE * 100).toFixed(0)}%)
                  </label>
                  {tonerAddGst && tonerSubtotal > 0 && (
                    <GstBreakdown price={tonerSubtotal} />
                  )}
                </div>

                <p className={`text-sm ${themeClasses.text.muted}`}>Blank fields are left off the printed receipt.</p>

                <Button
                  type="submit"
                  className={`w-full h-12 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary}`}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </form>
            </TabsContent>

            {/* Packing supplies */}
            <TabsContent value="packing">
              <div className="space-y-6">
                <div>
                  <h3 className={`mb-3 text-sm font-semibold ${themeClasses.text.primary}`}>Add a supply</h3>
                  <div className="flex flex-wrap gap-2">
                    {PACKING_PRESETS.filter((p) => !p.custom).map((p) => (
                      <Button
                        key={p.type}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addPackingPreset(p.type, p.cost)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        {p.type} ${p.cost}
                      </Button>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[10rem]">
                      <Label className={`text-xs ${themeClasses.text.secondary}`}>Custom name</Label>
                      <Input
                        value={packingCustomName}
                        onChange={(e) => setPackingCustomName(e.target.value)}
                        placeholder="e.g. Bubble wrap"
                        className={themeClasses.input}
                      />
                    </div>
                    <div className="w-28">
                      <Label className={`text-xs ${themeClasses.text.secondary}`}>Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={packingCustomCost}
                        onChange={(e) => setPackingCustomCost(e.target.value)}
                        placeholder="0.00"
                        className={themeClasses.input}
                      />
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addPackingCustom}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add
                    </Button>
                  </div>
                </div>

                {packingRows.length > 0 && (
                  <div className="space-y-3">
                    {packingRows.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center gap-3">
                        <span className={`flex-1 min-w-[8rem] text-sm font-medium ${themeClasses.text.primary}`}>
                          {r.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => patchPackingRow(r.id, { quantity: Math.max(1, r.quantity - 1) })}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className={`w-6 text-center text-sm ${themeClasses.text.primary}`}>{r.quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => patchPackingRow(r.id, { quantity: r.quantity + 1 })}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <label className={`flex items-center gap-1.5 text-xs ${themeClasses.text.secondary}`}>
                          <Checkbox
                            checked={r.taxable}
                            onCheckedChange={(v) => patchPackingRow(r.id, { taxable: v === true })}
                            className={checkboxClass}
                          />
                          Tax
                        </label>
                        <span className={`w-16 text-right text-sm ${themeClasses.text.primary}`}>
                          ${packingLineTotal(r).toFixed(2)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removePackingRow(r.id)}
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}

                    <div className={`border-t pt-3 text-sm ${themeClasses.text.secondary}`}>
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>${packingSubtotal(packingRows).toFixed(2)}</span>
                      </div>
                      {aggregatePackingTax(packingRows).map((t) => (
                        <div key={t.label} className="flex justify-between">
                          <span>{t.label}</span>
                          <span>${t.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className={`flex justify-between font-semibold ${themeClasses.text.primary}`}>
                        <span>Total</span>
                        <span>
                          ${round2(
                            packingSubtotal(packingRows) +
                              aggregatePackingTax(packingRows).reduce((s, t) => round2(s + t.amount), 0),
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  disabled={packingRows.length === 0}
                  onClick={addPackingToReceipt}
                  className={`w-full h-12 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 ${themeClasses.button.primary}`}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default StaffReceipts;