import CartridgeLineFields from "@/components/CartridgeLineFields";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
  RefreshCw
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
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
import { SegmentedTabs } from "@/components/shell/ToolPage";
import StaffLayout from "@/components/StaffLayout";
import GstBreakdown from "@/components/GstBreakdown";
import {
  useFormClasses,
  FormSection,
  FieldGrid,
  Field,
  ItemCard,
  AddRowButton,
  FormActions
} from "@/components/shell/FormKit";
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
  const kit = useFormClasses();
  const { addCartLines } = useAiMode();
  const { themeClasses } = useTheme();
  const checkboxClass = "border-pub-edge data-[state=checked]:bg-pub-ink data-[state=checked]:text-pub-paper";
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
    const taxes = provincialTaxRates[province as keyof typeof provincialTaxRates] ||
      provincialTaxRates['Alberta'];
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
  const gstLine =
    (price: number) => [{ label: `GST (${(GST_RATE * 100).toFixed(0)}%)`, amount: round2(price * GST_RATE) }];
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

  return (
    <StaffLayout
      title="Receipt Generator"
      subtitle="Shipping, key cutting, cartridge refills, toner sales, and packing"
      tool="receipts"
      tabs={
        <SegmentedTabs
          idBase="receipts"
          label="Receipt types"
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "shipping", label: "Shipping", shortLabel: "Shipping", icon: Package },
            { value: "key", label: "Key cutting", shortLabel: "Keys", icon: Key },
            { value: "cartridge", label: "Cartridge refill", shortLabel: "Refill", icon: Printer },
            { value: "toner", label: "Toner sale", shortLabel: "Toner", icon: Droplets },
            { value: "packing", label: "Packing", shortLabel: "Packing", icon: Box },
          ]}
        />
      }
      icon={Receipt}
    >
      <div className="border rounded-xl p-5 sm:p-6 bg-pub-paper border-pub-edge">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          {/* Shipping Receipt Form */}
          <TabsContent value="shipping" id="receipts-panel-shipping" aria-labelledby="receipts-tab-shipping">
            <form onSubmit={shippingForm.handleSubmit(addShippingToReceipt)} className="space-y-6">
              <FormSection>
                <FieldGrid>
                  <Field label="Receipt number" htmlFor="receiptNumber" span={4}>
                    <div className="flex gap-2">
                      <Input
                        id="receiptNumber"
                        {...shippingForm.register('receiptNumber')}
                        className={`${kit.input} ${kit.mono} flex-1`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateNewReceiptNumber('SH', 'shipping')}
                        className={`h-11 w-11 shrink-0 rounded-lg border ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field label="Date" htmlFor="date" span={3}>
                    <Input id="date" type="date" {...shippingForm.register('date')} className={kit.input} />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection title="Customer">
                <FieldGrid>
                  <Field label="Customer name" htmlFor="customerName" span={6}>
                    <Input id="customerName" {...shippingForm.register('customerName')} className={kit.input} />
                  </Field>
                  <Field label="Customer phone" htmlFor="customerPhone" span={4}>
                    <Input
                      id="customerPhone"
                      {...shippingForm.register('customerPhone')}
                      placeholder="(403) 555-0123"
                      className={`${kit.input} ${kit.mono}`}
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection
                title="Shipping items"
                action={
                  <AddRowButton
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
                  >Add shipping item
                  </AddRowButton>}
              >
                <div className="mt-3 space-y-2">
                  {shippingForm.watch('shippingItems')?.map((_, itemIndex) => (
                    <ItemCard
                      key={itemIndex}
                      title={<>Package {itemIndex + 1}</>}
                      onRemove={shippingForm.watch('shippingItems')?.length > 1 ? () => {
                        const currentItems = shippingForm.getValues('shippingItems') || [];
                        const newItems = currentItems.filter((_, i) => i !== itemIndex);
                        shippingForm.setValue('shippingItems', newItems);
                      } : undefined}
                      removeLabel={`Remove package ${itemIndex + 1}`}
                    >
                      <FieldGrid>
                        <Field
                          label="Courier service"
                          htmlFor={`shippingForm-shippingItems-${itemIndex}-courier`}
                          span={5}
                        >
                          <Input
                            {...shippingForm.register(`shippingItems.${itemIndex}.courier`)}
                            id={`shippingForm-shippingItems-${itemIndex}-courier`}
                            placeholder="UPS Ground"
                            className={kit.input}
                          />
                        </Field>
                        <Field
                          label="Tracking number"
                          htmlFor={`shippingForm-shippingItems-${itemIndex}-trackingNumber`}
                          span={7}
                        >
                          <Input
                            {...shippingForm.register(`shippingItems.${itemIndex}.trackingNumber`)}
                            id={`shippingForm-shippingItems-${itemIndex}-trackingNumber`}
                            className={`${kit.input} ${kit.mono}`}
                          />
                        </Field>
                        <Field
                          label="Destination city"
                          htmlFor={`shippingForm-shippingItems-${itemIndex}-destinationCity`}
                          span={5}
                        >
                          <Input
                            {...shippingForm.register(`shippingItems.${itemIndex}.destinationCity`)}
                            id={`shippingForm-shippingItems-${itemIndex}-destinationCity`}
                            className={kit.input}
                          />
                        </Field>
                        <Field
                          label="Province/state"
                          htmlFor={`shippingForm-shippingItems-${itemIndex}-destinationProvince`}
                          span={2}
                          half
                        >
                          <Input
                            {...shippingForm.register(`shippingItems.${itemIndex}.destinationProvince`)}
                            defaultValue="AB"
                            id={`shippingForm-shippingItems-${itemIndex}-destinationProvince`}
                            placeholder="AB"
                            className={kit.input}
                          />
                        </Field>
                        <Field
                          label="Country"
                          htmlFor={`shippingForm-shippingItems-${itemIndex}-destinationCountry`}
                          span={3}
                          half
                        >
                          <Input
                            {...shippingForm.register(`shippingItems.${itemIndex}.destinationCountry`)}
                            defaultValue="Canada"
                            id={`shippingForm-shippingItems-${itemIndex}-destinationCountry`}
                            placeholder="Canada"
                            className={kit.input}
                          />
                        </Field>
                        <Field
                          label="Cost ($)"
                          htmlFor={`shippingForm-shippingItems-${itemIndex}-shippingCost`}
                          span={2}
                          half
                        >
                          <Input
                            type="number"
                            step="0.01"
                            {...shippingForm.register(
                              `shippingItems.${itemIndex}.shippingCost`,
                              { valueAsNumber: true }
                            )}
                            id={`shippingForm-shippingItems-${itemIndex}-shippingCost`}
                            inputMode="decimal"
                            placeholder="0.00"
                            className={`${kit.input} ${kit.mono}`}
                          />
                        </Field>
                      </FieldGrid>
                      {/* Add-ons section */}
                      <div className="space-y-3">
                        <div
                          className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-pub-edge pt-4"
                        >
                          <h5 className="text-[13px] font-medium text-pub-ink">Add-ons</h5>
                          <div className="flex items-center gap-2">
                            <AddRowButton
                              onClick={() => {
                                const currentAddOns =
                                  shippingForm.getValues(`shippingItems.${itemIndex}.addOns`) || [];
                                const newAddOn: ShippingAddOn = {
                                  type: 'Small Box',
                                  cost: 5,
                                  taxes: provincialTaxRates['Alberta'].map(tax => ({ ...tax, amount: 0 }))
                                };
                                shippingForm.setValue(
                                  `shippingItems.${itemIndex}.addOns`,
                                  [...currentAddOns, newAddOn]
                                );
                              }}
                            >Add
                            </AddRowButton>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {shippingForm.watch(`shippingItems.${itemIndex}.addOns`)?.map((_, addonIndex) => (
                            <FieldGrid key={addonIndex}>
                              <Field
                                label={addonIndex === 0 ? "Add-on type" : undefined}
                                htmlFor={`shipping-addon-type-${addonIndex}-${itemIndex}`}
                                span={7}
                              >
                                <Select
                                  onValueChange={(value) => {
                                    const addon = shippingAddOns.find(a => a.type === value);
                                    if (addon) {
                                      shippingForm.setValue(`shippingItems.${itemIndex}.addOns.${addonIndex}.type`, value);
                                      shippingForm.setValue(
                                        `shippingItems.${itemIndex}.addOns.${addonIndex}.cost`,
                                        addon.cost
                                      );
                                    }
                                  }}
                                >
                                  <SelectTrigger
                                    id={`shipping-addon-type-${addonIndex}-${itemIndex}`}
                                    aria-label={addonIndex > 0 ? "Add-on type" : undefined}
                                    className={kit.input}
                                  >
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
                              </Field>
                              <Field
                                label={addonIndex === 0 ? "Price ($)" : undefined}
                                htmlFor={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-cost`}
                                span={3}
                                half
                              >
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...shippingForm.register(
                                    `shippingItems.${itemIndex}.addOns.${addonIndex}.cost`,
                                    { valueAsNumber: true }
                                  )}
                                  id={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-cost`}
                                  aria-label={addonIndex > 0 ? "Price ($)" : undefined}
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  className={`${kit.input} ${kit.mono}`}
                                />
                              </Field>
                              <Field span={2} half className="flex items-end justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentAddOns =
                                      shippingForm.getValues(`shippingItems.${itemIndex}.addOns`) || [];
                                    const newAddOns = currentAddOns.filter((_, i) => i !== addonIndex);
                                    shippingForm.setValue(`shippingItems.${itemIndex}.addOns`, newAddOns);
                                  }}
                                  className={`h-11 w-11 rounded-lg ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </Field>
                              {shippingForm.watch(`shippingItems.${itemIndex}.addOns.${addonIndex}.type`) === 'Custom' && (
                                <Field
                                  label={addonIndex === 0 ? "Custom name" : undefined}
                                  htmlFor={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-customName`}
                                  span={12}
                                >
                                  <Input
                                    {...shippingForm.register(`shippingItems.${itemIndex}.addOns.${addonIndex}.customName`)}
                                    id={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-customName`}
                                    aria-label={addonIndex > 0 ? "Custom name" : undefined}
                                    className={kit.input}
                                  />
                                </Field>
                              )}
                              {/* Add-on specific taxes */}
                              <div className="col-span-2 sm:col-span-12">
                                <div
                                  className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-pub-edge pt-4"
                                >
                                  <h5 className="text-[13px] font-medium text-pub-ink">Add-on taxes</h5>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      onValueChange={(province) => {
                                        const taxes =
                                          provincialTaxRates[province as keyof typeof provincialTaxRates] ||
                                          provincialTaxRates['Alberta'];
                                        const taxesWithAmount = taxes.map(tax => ({ ...tax, amount: 0 }));
                                        shippingForm.setValue(
                                          `shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`,
                                          taxesWithAmount
                                        );
                                      }}
                                    >
                                      <SelectTrigger
                                        id={`shipping-addon-tax-province-${addonIndex}-${itemIndex}`}
                                        className={`h-9 w-36 rounded-full px-3.5 text-[13px] ${themeClasses.input}`}
                                      >
                                        <SelectValue placeholder="Alberta" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.keys(provincialTaxRates).map(province => (
                                          <SelectItem key={province} value={province}>{province}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <AddRowButton
                                      onClick={() => {
                                        const currentTaxes =
                                          shippingForm.getValues(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`) || [];
                                        shippingForm.setValue(
                                          `shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`,
                                          [...currentTaxes, { name: '', percentage: 0, amount: 0 }]
                                        );
                                      }}
                                    >Add tax</AddRowButton>
                                  </div>
                                </div>
                                <div className="mt-3 space-y-2">
                                  {shippingForm.watch(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`)?.map((_, taxIndex) => (
                                    <FieldGrid key={taxIndex}>
                                      <Field
                                        label={taxIndex === 0 ? "Tax name" : undefined}
                                        htmlFor={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-taxes-${taxIndex}-name`}
                                        span={7}
                                      >
                                        <Input
                                          {...shippingForm.register(
                                            `shippingItems.${itemIndex}.addOns.${addonIndex}.taxes.${taxIndex}.name`
                                          )}
                                          id={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-taxes-${taxIndex}-name`}
                                          aria-label={taxIndex > 0 ? "Tax name" : undefined}
                                          className={kit.input}
                                        />
                                      </Field>
                                      <Field
                                        label={taxIndex === 0 ? "Percent (%)" : undefined}
                                        htmlFor={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-taxes-${taxIndex}-percentage`}
                                        span={3}
                                        half
                                      >
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...shippingForm.register(
                                            `shippingItems.${itemIndex}.addOns.${addonIndex}.taxes.${taxIndex}.percentage`,
                                            { valueAsNumber: true }
                                          )}
                                          id={`shippingForm-shippingItems-${itemIndex}-addOns-${addonIndex}-taxes-${taxIndex}-percentage`}
                                          aria-label={taxIndex > 0 ? "Percent (%)" : undefined}
                                          inputMode="decimal"
                                          placeholder="%"
                                          className={`${kit.input} ${kit.mono}`}
                                        />
                                      </Field>
                                      <Field span={2} half className="flex items-end justify-end">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            const currentTaxes =
                                              shippingForm.getValues(`shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`) || [];
                                            const newTaxes = currentTaxes.filter((_, i) => i !== taxIndex);
                                            shippingForm.setValue(
                                              `shippingItems.${itemIndex}.addOns.${addonIndex}.taxes`,
                                              newTaxes
                                            );
                                          }}
                                          className={`h-11 w-11 rounded-lg ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </Field>
                                    </FieldGrid>
                                  ))}</div>
                              </div>
                            </FieldGrid>
                          ))}
                        </div>
                      </div>
                      {/* Shipping taxes section */}
                      <div className="space-y-3">
                        <div
                          className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-pub-edge pt-4"
                        >
                          <h5 className="text-[13px] font-medium text-pub-ink">Shipping taxes</h5>
                          <div className="flex items-center gap-2">
                            <Select onValueChange={(province) => setProvincialTax(province, 'shipping', itemIndex)}>
                              <SelectTrigger
                                id={`shipping-tax-province-${itemIndex}`}
                                className={`h-9 w-36 rounded-full px-3.5 text-[13px] ${themeClasses.input}`}
                              >
                                <SelectValue placeholder="Alberta" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(provincialTaxRates).map(province => (
                                  <SelectItem key={province} value={province}>{province}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <AddRowButton
                              onClick={() => {
                                const currentTaxes =
                                  shippingForm.getValues(`shippingItems.${itemIndex}.taxes`) || [];
                                shippingForm.setValue(
                                  `shippingItems.${itemIndex}.taxes`,
                                  [...currentTaxes, { name: '', percentage: 0, amount: 0 }]
                                );
                              }}
                            >Add tax
                            </AddRowButton>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {shippingForm.watch(`shippingItems.${itemIndex}.taxes`)?.map((_, taxIndex) => (
                            <FieldGrid key={taxIndex}>
                              <Field
                                label={taxIndex === 0 ? "Tax name" : undefined}
                                htmlFor={`shippingForm-shippingItems-${itemIndex}-taxes-${taxIndex}-name`}
                                span={7}
                              >
                                <Input
                                  {...shippingForm.register(`shippingItems.${itemIndex}.taxes.${taxIndex}.name`)}
                                  id={`shippingForm-shippingItems-${itemIndex}-taxes-${taxIndex}-name`}
                                  aria-label={taxIndex > 0 ? "Tax name" : undefined}
                                  className={kit.input}
                                />
                              </Field>
                              <Field
                                label={taxIndex === 0 ? "Percent (%)" : undefined}
                                htmlFor={`shippingForm-shippingItems-${itemIndex}-taxes-${taxIndex}-percentage`}
                                span={3}
                                half
                              >
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...shippingForm.register(
                                    `shippingItems.${itemIndex}.taxes.${taxIndex}.percentage`,
                                    { valueAsNumber: true }
                                  )}
                                  id={`shippingForm-shippingItems-${itemIndex}-taxes-${taxIndex}-percentage`}
                                  aria-label={taxIndex > 0 ? "Percent (%)" : undefined}
                                  inputMode="decimal"
                                  placeholder="%"
                                  className={`${kit.input} ${kit.mono}`}
                                />
                              </Field>
                              <Field span={2} half className="flex items-end justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const currentTaxes =
                                      shippingForm.getValues(`shippingItems.${itemIndex}.taxes`) || [];
                                    const newTaxes = currentTaxes.filter((_, i) => i !== taxIndex);
                                    shippingForm.setValue(`shippingItems.${itemIndex}.taxes`, newTaxes);
                                  }}
                                  className={`h-11 w-11 rounded-lg ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </Field>
                            </FieldGrid>
                          ))}
                        </div>
                      </div>
                    </ItemCard>
                  ))}</div>
              </FormSection>
              <FormActions>
                <Button type="submit" className={kit.primary}>
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </FormActions>
            </form>
          </TabsContent>

          {/* Key Cutting Receipt Form */}
          <TabsContent value="key" id="receipts-panel-key" aria-labelledby="receipts-tab-key">
            <form onSubmit={keyForm.handleSubmit(addKeyToReceipt)} className="space-y-6">
              <FormSection>
                <FieldGrid>
                  <Field label="Receipt number" htmlFor="keyReceiptNumber" span={4}>
                    <div className="flex gap-2">
                      <Input
                        id="keyReceiptNumber"
                        {...keyForm.register('receiptNumber')}
                        className={`${kit.input} ${kit.mono} flex-1`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => generateNewReceiptNumber('KEY', 'key')}
                        className={`h-11 w-11 shrink-0 rounded-lg border ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field label="Date" htmlFor="keyDate" span={3}>
                    <Input id="keyDate" type="date" {...keyForm.register('date')} className={kit.input} />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection title="Customer">
                <FieldGrid>
                  <Field label="Customer name" htmlFor="keyCustomerName" span={6}>
                    <Input id="keyCustomerName" {...keyForm.register('customerName')} className={kit.input} />
                  </Field>
                  <Field label="Customer phone" htmlFor="keyCustomerPhone" span={4}>
                    <Input
                      id="keyCustomerPhone"
                      {...keyForm.register('customerPhone')}
                      placeholder="(403) 555-0123"
                      className={`${kit.input} ${kit.mono}`}
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection
                title="Key items"
                action={
                  <AddRowButton
                    onClick={() => {
                      const currentItems = keyForm.getValues('keyItems') || [];
                      keyForm.setValue(
                        'keyItems',
                        [...currentItems, { model: '', quantity: 1, priceEach: 0, total: 0 }]
                      );
                    }}
                  >Add key item</AddRowButton>}
              >
                <div className="mt-3 space-y-2">
                  {keyForm.watch('keyItems')?.map((_, index) => (
                    <ItemCard
                      key={index}
                      title={`Key ${index + 1}`}
                      onRemove={() => {
                        const currentItems = keyForm.getValues('keyItems') || [];
                        const newItems = currentItems.filter((_, i) => i !== index);
                        keyForm.setValue(
                          'keyItems',
                          newItems.length > 0 ? newItems : [{ model: '', quantity: 1, priceEach: 0, total: 0 }]
                        );
                      }}
                      removeLabel={`Remove key ${index + 1}`}
                    >
                      <FieldGrid>
                        <Field label="Key model" htmlFor={`keyForm-keyItems-${index}-model`} span={6} required>
                          <Input
                            {...keyForm.register(`keyItems.${index}.model`)}
                            id={`keyForm-keyItems-${index}-model`}
                            placeholder="House key, mailbox, etc."
                            className={kit.input}
                          />
                        </Field>
                        <Field label="Quantity" htmlFor={`keyForm-keyItems-${index}-quantity`} span={3} half>
                          <Input
                            type="number"
                            min="1"
                            {...keyForm.register(`keyItems.${index}.quantity`, { valueAsNumber: true })}
                            id={`keyForm-keyItems-${index}-quantity`}
                            className={`${kit.input} ${kit.mono}`}
                          />
                        </Field>
                        <Field
                          label="Price each ($)"
                          htmlFor={`keyForm-keyItems-${index}-priceEach`}
                          span={3}
                          half
                          required
                        >
                          <Input
                            type="number"
                            step="0.01"
                            {...keyForm.register(`keyItems.${index}.priceEach`, { valueAsNumber: true })}
                            id={`keyForm-keyItems-${index}-priceEach`}
                            inputMode="decimal"
                            placeholder="0.00"
                            className={`${kit.input} ${kit.mono}`}
                          />
                        </Field>
                      </FieldGrid>
                    </ItemCard>
                  ))}</div>
              </FormSection>
              <FormSection>
                <div className="space-y-3">
                  <div
                    className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-pub-edge pt-4"
                  >
                    <h5 className="text-[13px] font-medium text-pub-ink">Taxes</h5>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(province) => setProvincialTax(province, 'key')}>
                        <SelectTrigger
                          id="key-tax-province"
                          className={`h-9 w-36 rounded-full px-3.5 text-[13px] ${themeClasses.input}`}
                        >
                          <SelectValue placeholder="Alberta" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(provincialTaxRates).map(province => (
                            <SelectItem key={province} value={province}>{province}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <AddRowButton
                        onClick={() => {
                          const currentTaxes = keyForm.getValues('taxes') || [];
                          keyForm.setValue('taxes', [...currentTaxes, { name: '', percentage: 0, amount: 0 }]);
                        }}
                      >Add tax
                      </AddRowButton>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {keyForm.watch('taxes')?.map((_, index) => (
                      <FieldGrid key={index}>
                        <Field
                          label={index === 0 ? "Tax name" : undefined}
                          htmlFor={`keyForm-taxes-${index}-name`}
                          span={7}
                        >
                          <Input
                            {...keyForm.register(`taxes.${index}.name`)}
                            id={`keyForm-taxes-${index}-name`}
                            aria-label={index > 0 ? "Tax name" : undefined}
                            placeholder="GST, HST, PST, etc."
                            className={kit.input}
                          />
                        </Field>
                        <Field
                          label={index === 0 ? "Percentage (%)" : undefined}
                          htmlFor={`keyForm-taxes-${index}-percentage`}
                          span={3}
                          half
                        >
                          <Input
                            type="number"
                            step="0.01"
                            {...keyForm.register(`taxes.${index}.percentage`, { valueAsNumber: true })}
                            id={`keyForm-taxes-${index}-percentage`}
                            aria-label={index > 0 ? "Percentage (%)" : undefined}
                            inputMode="decimal"
                            placeholder="5.00"
                            className={`${kit.input} ${kit.mono}`}
                          />
                        </Field>
                        <Field span={2} half className="flex items-end justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const currentTaxes = keyForm.getValues('taxes') || [];
                              const newTaxes = currentTaxes.filter((_, i) => i !== index);
                              keyForm.setValue('taxes', newTaxes);
                            }}
                            className={`h-11 w-11 rounded-lg ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Field>
                      </FieldGrid>
                    ))}</div>
                </div>
              </FormSection>
              <FormActions>
                <Button type="submit" className={kit.primary}>
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </FormActions>
            </form>
          </TabsContent>

          {/* Cartridge Refill Receipt Form */}
          <TabsContent
            value="cartridge"
            id="receipts-panel-cartridge"
            aria-labelledby="receipts-tab-cartridge"
          >
            <form onSubmit={cartridgeForm.handleSubmit(addCartridgeToReceipt)} className="space-y-6">
              <FormSection>
                <FieldGrid>
                  <Field label="Receipt number" htmlFor="crReceiptNumber" span={4}>
                    <div className="flex gap-2">
                      <Input
                        id="crReceiptNumber"
                        {...cartridgeForm.register('receiptNumber')}
                        className={`${kit.input} ${kit.mono} flex-1`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => cartridgeForm.setValue('receiptNumber', generateReceiptNumber('CR'))}
                        className={`h-11 w-11 shrink-0 rounded-lg border ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field label="Date" htmlFor="crDate" span={3}>
                    <Input id="crDate" type="date" {...cartridgeForm.register('date')} className={kit.input} />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection title="Customer">
                <FieldGrid>
                  <Field label="Customer name" htmlFor="cartridgeForm-customerName" span={6}>
                    <Input
                      {...cartridgeForm.register('customerName')}
                      id="cartridgeForm-customerName"
                      className={kit.input}
                    />
                  </Field>
                  <Field label="Customer phone" htmlFor="cartridgeForm-customerPhone" span={4}>
                    <Input
                      {...cartridgeForm.register('customerPhone')}
                      id="cartridgeForm-customerPhone"
                      placeholder="(403) 555-0123"
                      className={`${kit.input} ${kit.mono}`}
                    />
                  </Field>
                  <Field label="Email" htmlFor="cartridgeForm-customerEmail" span={6}>
                    <Input
                      type="email"
                      {...cartridgeForm.register('customerEmail')}
                      id="cartridgeForm-customerEmail"
                      placeholder="customer@email.com"
                      className={kit.input}
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
              <CartridgeLineFields
                form={cartridgeForm}
                themeClasses={themeClasses}
                requirePrice
              />

              <FormSection>
                <FieldGrid>
                  <Field
                    span={12}
                    error={
                      cartridgeForm.formState.errors.cartridges ? "Every cartridge needs a model and a valid price." : undefined}
                  >{null}</Field>
                </FieldGrid>
              </FormSection>
              <FormSection>
                <div>
                  <FieldGrid>
                    <Field label={<>Add GST ({(GST_RATE * 100).toFixed(0)}%)</>} htmlFor="cartridge-gst" span={6}>
                      <Checkbox
                        id="cartridge-gst"
                        checked={cartridgeAddGst}
                        onCheckedChange={(c) => setCartridgeAddGst(c === true)}
                        className={checkboxClass}
                      />
                    </Field>
                  </FieldGrid>
                  {cartridgeAddGst && cartridgeSubtotal > 0 && (
                    <GstBreakdown price={cartridgeSubtotal} />
                  )}
                </div>
              </FormSection>
              <FormSection>
                <FieldGrid>
                  <Field label="Notes" htmlFor="cartridgeForm-notes" span={12}>
                    <Textarea
                      rows={2}
                      {...cartridgeForm.register('notes')}
                      id="cartridgeForm-notes"
                      className={kit.textarea}
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection>
                <p className="text-sm text-pub-muted">Blank fields are left off the printed receipt.</p>
              </FormSection>
              <FormActions>
                <Button type="submit" className={kit.primary}>
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </FormActions>
            </form>
          </TabsContent>

          {/* Toner Sale Receipt Form */}
          <TabsContent value="toner" id="receipts-panel-toner" aria-labelledby="receipts-tab-toner">
            <form onSubmit={tonerForm.handleSubmit(addTonerToReceipt)} className="space-y-6">
              <FormSection>
                <FieldGrid>
                  <Field label="Receipt number" htmlFor="tonReceiptNumber" span={4}>
                    <div className="flex gap-2">
                      <Input
                        id="tonReceiptNumber"
                        {...tonerForm.register('receiptNumber')}
                        className={`${kit.input} ${kit.mono} flex-1`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => tonerForm.setValue('receiptNumber', generateReceiptNumber('TON'))}
                        className={`h-11 w-11 shrink-0 rounded-lg border ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
                        title="Generate new receipt number"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </Field>
                  <Field label="Date" htmlFor="tonDate" span={3}>
                    <Input id="tonDate" type="date" {...tonerForm.register('date')} className={kit.input} />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection title="Customer">
                <FieldGrid>
                  <Field label="Customer name" htmlFor="tonerForm-customerName" span={6} optional>
                    <Input {...tonerForm.register('customerName')} id="tonerForm-customerName" className={kit.input} />
                  </Field>
                  <Field label="Customer phone" htmlFor="tonerForm-customerPhone" span={4} optional>
                    <Input
                      {...tonerForm.register('customerPhone')}
                      id="tonerForm-customerPhone"
                      placeholder="(403) 555-0123"
                      className={`${kit.input} ${kit.mono}`}
                    />
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection
                title="Toners"
                action={
                  <AddRowButton onClick={() => tonerLines.append(emptyTonerLine())}>Add toner
                  </AddRowButton>}
              >
                <div className="space-y-3">{tonerLines.fields.map((field, index) => (
                  <ItemCard
                    key={field.id}
                    title={`Toner ${index + 1}`}
                    onRemove={tonerLines.fields.length > 1 ? () => tonerLines.remove(index) : undefined}
                    removeLabel={`Remove toner ${index + 1}`}
                  >
                    <FieldGrid>
                      <Field
                        label="Model"
                        htmlFor={`tonerForm-toners-${index}-model`}
                        span={8}
                        required
                        error={tonerForm.formState.errors.toners?.[index]?.model?.message as string}
                      >
                        <Input
                          {...tonerForm.register(`toners.${index}.model`, { required: 'Model is required' })}
                          id={`tonerForm-toners-${index}-model`}
                          placeholder="HP 26A"
                          className={kit.input}
                        />
                      </Field>
                      <Field
                        label="Price ($)"
                        htmlFor={`tonerForm-toners-${index}-price`}
                        span={3}
                        half
                        required
                        error={tonerForm.formState.errors.toners?.[index]?.price?.message as string}
                      >
                        <Input
                          type="number"
                          step="0.01"
                          {...tonerForm.register(`toners.${index}.price`, {
                            valueAsNumber: true,
                            validate: (v) => (isFilledNumber(v) && v >= 0) || 'A valid price is required',
                          })}
                          id={`tonerForm-toners-${index}-price`}
                          inputMode="decimal"
                          placeholder="0.00"
                          className={`${kit.input} ${kit.mono}`}
                        />
                      </Field>
                    </FieldGrid>
                  </ItemCard>
                ))}</div>
                <FieldGrid>
                  <Field
                    span={12}
                    error={
                      tonerForm.formState.errors.toners ? "Every toner needs a model and a valid price." : undefined}
                  >{null}</Field>
                </FieldGrid>
                {/* Only worth showing once there's more than one line to add up. */}
              </FormSection>
              <FormSection>
                <div>
                  <FieldGrid>
                    <Field label={<>Add GST ({(GST_RATE * 100).toFixed(0)}%)</>} htmlFor="toner-gst" span={6}>
                      <Checkbox
                        id="toner-gst"
                        checked={tonerAddGst}
                        onCheckedChange={(c) => setTonerAddGst(c === true)}
                        className={checkboxClass}
                      />
                    </Field>
                  </FieldGrid>
                  {tonerAddGst && tonerSubtotal > 0 && (
                    <GstBreakdown price={tonerSubtotal} />
                  )}
                </div>
              </FormSection>
              <FormSection>
                <p className="text-sm text-pub-muted">Blank fields are left off the printed receipt.</p>
              </FormSection>
              <FormActions
                summary={tonerLines.fields.length > 1 && (
                  <div className="flex justify-between text-sm font-semibold  text-pub-ink">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">${tonerSubtotal.toFixed(2)}</span>
                  </div>
                )}
              >
                <Button type="submit" className={kit.primary}>
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </FormActions>
            </form>
          </TabsContent>

          {/* Packing supplies */}
          <TabsContent value="packing" id="receipts-panel-packing" aria-labelledby="receipts-tab-packing">
            <form className="space-y-6">
              <FormSection title="Add a supply">
                <div className="flex flex-wrap gap-2">
                  {PACKING_PRESETS.filter((p) => !p.custom).map((p) => (
                    <Button
                      key={p.type}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPackingPreset(p.type, p.cost)}
                      className={`h-11 rounded-full border px-4 text-sm font-medium ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      {p.type} ${p.cost}
                    </Button>
                  ))}
                </div>
                <FieldGrid className="mt-4">
                  <Field label="Custom item" htmlFor="packing-custom-name" span={7}>
                    <Input
                      value={packingCustomName}
                      onChange={(e) => setPackingCustomName(e.target.value)}
                      id="packing-custom-name"
                      placeholder="Bubble wrap"
                      className={kit.input}
                    />
                  </Field>
                  <Field label="Price ($)" htmlFor="packing-custom-cost" span={3} half>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={packingCustomCost}
                      onChange={(e) => setPackingCustomCost(e.target.value)}
                      id="packing-custom-cost"
                      inputMode="decimal"
                      placeholder="0.00"
                      className={`${kit.input} ${kit.mono}`}
                    />
                  </Field>
                  <Field span={2} half className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPackingCustom}
                      className={kit.secondary}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add
                    </Button>
                  </Field>
                </FieldGrid>
              </FormSection>
              <FormSection>
                {packingRows.length === 0 && (
                  <p className="text-[13px] text-pub-muted">Nothing added yet. Pick a supply above.</p>
                )}
                {packingRows.length > 0 && (
                  <div className="space-y-3">
                    {packingRows.map((r) => (
                      <ItemCard
                        key={r.id}
                        title={r.name}
                        onRemove={() => removePackingRow(r.id)}
                        removeLabel={`Remove ${r.name}`}
                      >
                        <FieldGrid>
                          <Field label="Quantity" span={3} half>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-11 w-11 rounded-lg ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                                onClick={() => patchPackingRow(r.id, { quantity: Math.max(1, r.quantity - 1) })}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-6 text-center text-sm font-mono tabular-nums text-pub-ink">
                                {r.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={`h-11 w-11 rounded-lg ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                                onClick={() => patchPackingRow(r.id, { quantity: r.quantity + 1 })}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </Field>
                          <Field label="Tax" htmlFor={`packing-tax-${r.id}`} span={3} half>
                            <Checkbox
                              id={`packing-tax-${r.id}`}
                              checked={r.taxable}
                              onCheckedChange={(v) => patchPackingRow(r.id, { taxable: v === true })}
                              className={checkboxClass}
                            />
                          </Field>
                          <Field label="Total" span={3} half>
                            <span className="w-16 text-right text-sm font-mono tabular-nums text-pub-ink">
                              ${packingLineTotal(r).toFixed(2)}
                            </span>
                          </Field>
                        </FieldGrid>
                      </ItemCard>
                    ))}

                  </div>
                )}</FormSection>
              <FormActions
                summary={packingRows.length > 0 && (
                  <div className="border-t pt-3 text-sm text-pub-muted">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums">${packingSubtotal(packingRows).toFixed(2)}</span>
                    </div>
                    {aggregatePackingTax(packingRows).map((t) => (
                      <div key={t.label} className="flex justify-between">
                        <span>{t.label}</span>
                        <span className="font-mono tabular-nums">${t.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-pub-ink">
                      <span>Total</span>
                      <span className="font-mono tabular-nums">
                        ${round2(
                          packingSubtotal(packingRows) +
                          aggregatePackingTax(packingRows).reduce((s, t) => round2(s + t.amount), 0),
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>)}
              >
                <Button
                  type="button"
                  disabled={packingRows.length === 0}
                  onClick={addPackingToReceipt}
                  className={kit.primary}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Add to receipt
                </Button>
              </FormActions>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </StaffLayout>
  );
};

export default StaffReceipts;