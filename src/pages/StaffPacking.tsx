// Packing: box and envelope supplies, detached from the Shipping receipt into
// their own tab. Pick supplies, set quantity, then either add them onto the open
// receipt (multi-item mode) or print a standalone packing receipt. The presets
// and tax math live in lib/packing.ts so the chat and this page agree.
import { useState } from "react";
import { Package as PackageIcon, Plus, Minus, Trash2, Download, Printer, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import StaffLayout from "@/components/StaffLayout";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";
import { useAiMode } from "@/ai/context";
import { packingToCartLine } from "@/ai/actions/cartLines";
import {
  PACKING_PRESETS,
  aggregatePackingTax,
  buildPackingReceiptOpts,
  emptyPackingItem,
  packingLineTotal,
  packingSubtotal,
  type PackingItem,
} from "@/lib/packing";
import { round2 } from "@/lib/simpleReceipt";
import { downloadReceipt, printReceipt } from "@/ai/receiptOutput";

interface Row extends PackingItem {
  id: string;
}

let rowCounter = 0;
const rowId = () => `pk-${(rowCounter += 1)}`;

const StaffPacking = () => {
  const { themeClasses } = useTheme();
  const { addCartLines } = useAiMode();
  const [rows, setRows] = useState<Row[]>([]);
  const [customName, setCustomName] = useState("");
  const [customCost, setCustomCost] = useState("");

  const addPreset = (name: string, cost: number) => {
    setRows((prev) => [...prev, { ...emptyPackingItem(), id: rowId(), name, cost }]);
  };

  const addCustom = () => {
    const name = customName.trim();
    const cost = Number(customCost);
    if (!name || !Number.isFinite(cost) || cost < 0) {
      toast({ title: "Add a name and a valid price", variant: "destructive" });
      return;
    }
    setRows((prev) => [...prev, { ...emptyPackingItem(), id: rowId(), name, cost }]);
    setCustomName("");
    setCustomCost("");
  };

  const patch = (id: string, next: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const subtotal = packingSubtotal(rows);
  const taxLines = aggregatePackingTax(rows);
  const taxTotal = taxLines.reduce((sum, t) => round2(sum + t.amount), 0);
  const total = round2(subtotal + taxTotal);

  const handleAddToReceipt = () => {
    if (rows.length === 0) return;
    addCartLines(rows.map((r) => packingToCartLine(r)));
    toast({
      title: "Added to the receipt",
      description: "It is on the open receipt panel. Add more from any tab, then Finish it.",
    });
    setRows([]);
  };

  const handleDownload = () => {
    if (rows.length === 0) return;
    downloadReceipt(buildPackingReceiptOpts(rows), "letter");
  };

  const handlePrint = () => {
    if (rows.length === 0) return;
    printReceipt(buildPackingReceiptOpts(rows), "letter");
  };

  return (
    <StaffLayout
      title="Packing"
      subtitle="Boxes, envelopes, and packing supplies"
      icon={PackageIcon}
      iconColor="text-teal-500"
      backTo="/staff/dashboard"
      backLabel="Dashboard"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Presets */}
        <Card className={themeClasses.card.primary}>
          <CardContent className="p-5">
            <h3 className={`mb-3 text-sm font-semibold ${themeClasses.text.primary}`}>Add a supply</h3>
            <div className="flex flex-wrap gap-2">
              {PACKING_PRESETS.filter((p) => !p.custom).map((p) => (
                <Button
                  key={p.type}
                  variant="outline"
                  size="sm"
                  onClick={() => addPreset(p.type, p.cost)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {p.type} ${p.cost}
                </Button>
              ))}
            </div>

            {/* Custom entry */}
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[10rem]">
                <Label className={`text-xs ${themeClasses.text.secondary}`}>Custom name</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Bubble wrap"
                />
              </div>
              <div className="w-28">
                <Label className={`text-xs ${themeClasses.text.secondary}`}>Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customCost}
                  onChange={(e) => setCustomCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button variant="outline" size="sm" onClick={addCustom}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chosen rows */}
        {rows.length > 0 && (
          <Card className={themeClasses.card.primary}>
            <CardContent className="p-5 space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-3">
                  <span className={`flex-1 min-w-[8rem] text-sm font-medium ${themeClasses.text.primary}`}>
                    {r.name}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => patch(r.id, { quantity: Math.max(1, r.quantity - 1) })}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className={`w-6 text-center text-sm ${themeClasses.text.primary}`}>{r.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => patch(r.id, { quantity: r.quantity + 1 })}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <label className={`flex items-center gap-1.5 text-xs ${themeClasses.text.secondary}`}>
                    <Checkbox
                      checked={r.taxable}
                      onCheckedChange={(v) => patch(r.id, { taxable: v === true })}
                    />
                    Tax
                  </label>

                  <span className={`w-16 text-right text-sm ${themeClasses.text.primary}`}>
                    ${packingLineTotal(r).toFixed(2)}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => remove(r.id)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {/* Totals */}
              <div className={`mt-2 border-t pt-3 text-sm ${themeClasses.text.secondary}`}>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {taxLines.map((t) => (
                  <div key={t.label} className="flex justify-between">
                    <span>{t.label}</span>
                    <span>${t.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className={`flex justify-between font-semibold ${themeClasses.text.primary}`}>
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={handleAddToReceipt}>
                  <Receipt className="h-4 w-4 mr-1.5" />
                  Add to receipt
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download receipt
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1.5" />
                  Print
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StaffLayout>
  );
};

export default StaffPacking;
