import { GST_RATE, round2 } from "@/lib/simpleReceipt";

// Small Subtotal / GST / Total summary shown under a price field when GST is added.
const GstBreakdown = ({ price }: { price: number }) => {
  const gst = round2(price * GST_RATE);
  const total = round2(price + gst);
  const pct = (GST_RATE * 100).toFixed(0);

  return (
    <div className="mt-2 rounded-md border border-pub-edge bg-pub-sunk text-pub-muted px-3 py-2 text-sm space-y-0.5">
      <div className="flex justify-between"><span>Subtotal</span><span className="font-mono tabular-nums">${price.toFixed(2)}</span></div>
      <div className="flex justify-between"><span>GST ({pct}%)</span><span className="font-mono tabular-nums">${gst.toFixed(2)}</span></div>
      <div className="flex justify-between font-semibold text-pub-ink"><span>Total</span><span className="font-mono tabular-nums">${total.toFixed(2)}</span></div>
    </div>
  );
};

export default GstBreakdown;
