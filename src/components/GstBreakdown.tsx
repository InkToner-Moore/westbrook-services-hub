import { GST_RATE, round2 } from "@/lib/simpleReceipt";

// Small Subtotal / GST / Total summary shown under a price field when GST is added.
const GstBreakdown = ({ price }: { price: number }) => {
  const gst = round2(price * GST_RATE);
  const total = round2(price + gst);
  const pct = (GST_RATE * 100).toFixed(0);

  return (
    <div className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-0.5">
      <div className="flex justify-between"><span>Subtotal</span><span>${price.toFixed(2)}</span></div>
      <div className="flex justify-between"><span>GST ({pct}%)</span><span>${gst.toFixed(2)}</span></div>
      <div className="flex justify-between font-semibold"><span>Total</span><span>${total.toFixed(2)}</span></div>
    </div>
  );
};

export default GstBreakdown;
