import { useRef, useState } from "react";
import { Search, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { queryCollection } from "@/lib/firestore";
import { ORDER_STATUS_COLLECTION, OrderStatusDoc, normalizeLastName } from "@/lib/orderStatus";
import { PHONE_HREF, PHONE_DISPLAY } from "@/lib/storeInfo";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  ready: "Ready for pickup",
  picked_up: "Picked up",
};
const STATUS_NEXT: Record<string, string> = {
  in_progress: "We're still working on it. Check back soon.",
  ready: "Come by any time we're open.",
};

const RefillStatus = () => {
  const [refillLastName, setRefillLastName] = useState("");
  const [refillResults, setRefillResults] = useState<OrderStatusDoc[] | null>(null);
  const [refillError, setRefillError] = useState<string | null>(null);
  // A name with no refills is an answer, not a failure, so it is not shown in red.
  const [refillNotFound, setRefillNotFound] = useState(false);
  const [refillLoading, setRefillLoading] = useState(false);
  const refillInputRef = useRef<HTMLInputElement>(null);

  const checkRefillStatus = async () => {
    const lastName = normalizeLastName(refillLastName);
    setRefillNotFound(false);
    if (!lastName) {
      setRefillError("Enter the last name on the order.");
      setRefillResults(null);
      refillInputRef.current?.focus();
      return;
    }

    setRefillLoading(true);
    setRefillError(null);
    setRefillResults(null);

    try {
      const matches = await queryCollection<OrderStatusDoc>(
        ORDER_STATUS_COLLECTION,
        "customerLastName",
        lastName,
      );

      if (matches.length > 0) {
        setRefillResults(matches);
      } else {
        setRefillNotFound(true);
      }
    } catch (error) {
      console.error("Failed to check refill status:", error);
      setRefillError("That didn't go through. Check your connection and try again, or give us a call.");
    } finally {
      setRefillLoading(false);
    }
  };

  return (
    <>
      <h2 className="pub-tool-title font-display font-medium">Check a refill status</h2>
      <p className="mt-3 text-base text-pub-muted">Enter the last name on the order</p>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!refillLoading) checkRefillStatus();
        }}
        className="mt-6 space-y-5"
      >
        <div>
          <label htmlFor="refill-last-name" className="mb-1.5 block text-[15px] font-medium">
            Last name
          </label>
          <input
            id="refill-last-name"
            ref={refillInputRef}
            placeholder="e.g. Smith"
            autoComplete="family-name"
            value={refillLastName}
            onChange={(e) => setRefillLastName(e.target.value)}
            aria-invalid={!!refillError}
            aria-describedby="refill-feedback"
            className="pub-field h-14 w-full rounded-xl border border-pub-edge bg-pub-counter px-3 text-lg"
          />
        </div>
        <button
          type="submit"
          disabled={refillLoading}
          className="pub-button h-14 w-full bg-pub-ink text-pub-counter"
        >
          {refillLoading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}Check status
        </button>
        <div id="refill-feedback" aria-live="polite" className="space-y-4 empty:hidden">
          {refillResults && (
            <div className="space-y-3">
              <p className="text-sm text-pub-muted">
                {refillResults.length === 1
                  ? "Your refill"
                  : `${refillResults.length} refills under that name`}
              </p>
              {refillResults.map((result, index) => (
                <div
                  key={result.orderId}
                  className={
                    "pub-ticket relative overflow-hidden rounded-xl border border-pub-edge bg-pub-counter" +
                    " flex"
                  }
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <span className="pub-perforation absolute inset-y-0 left-14 border-l border-dashed border-pub-edge" />
                  <span className="pub-notch pub-notch-top" />
                  <span className="pub-notch pub-notch-bottom" />
                  <div
                    className={
                      `w-14 shrink-0 flex justify-center pt-5 ` +
                      (result.status === "ready"
                        ? "text-pub-open"
                        : result.status === "in_progress"
                          ? "text-pub-brass"
                          : "text-pub-muted")
                    }
                  >
                    {result.status === "ready" ? <CheckCircle size={22} /> : <Clock size={22} />}
                  </div>
                  <div className="min-w-0 p-4 sm:p-5">
                    <p className="font-display font-medium text-2xl">
                      {STATUS_LABELS[result.status] || result.status}
                    </p>
                    {STATUS_NEXT[result.status] && (
                      <p className="mt-1 text-sm text-pub-muted">{STATUS_NEXT[result.status]}</p>
                    )}
                    {refillResults.length > 1 && (
                      <p className="mt-3 font-mono text-xs tabular-nums text-pub-muted break-all">
                        {result.orderId}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {refillError && (
            <div className="pub-error flex items-start gap-2 rounded-xl border p-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm">{refillError}</p>
            </div>
          )}
          {refillNotFound && (
            <div className="rounded-xl border border-pub-edge bg-pub-counter p-4 text-sm text-pub-muted">
              <p className="font-medium text-pub-ink">No refills under that name</p>
              <p className="mt-1">
                Check the spelling, or call us at{" "}
                <a href={PHONE_HREF} className="pub-link text-pub-accent inline-flex min-h-11 items-center">
                  {PHONE_DISPLAY}
                </a>{" "}
                and we'll look it up.
              </p>
            </div>
          )}
        </div>
      </form>
    </>
  );
};

export default RefillStatus;
