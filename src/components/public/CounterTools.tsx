import SmartTracker from "@/components/SmartTracker";
import RefillStatus from "./RefillStatus";

const CounterTools = () => {
  return (
    <section aria-label="Self-serve tools" className="py-16 sm:py-24">
      <div
        className={
          "grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-pub-edge rounded-2xl" +
          " border border-pub-edge bg-pub-paper"
        }
      >
        <div className="min-w-0 p-6 sm:p-10">
          <h2 className="pub-tool-title font-display font-medium">Track a parcel</h2>
          <p className="mt-3 text-base text-pub-muted">Enter the tracking number, then choose the courier</p>
          <SmartTracker variant="plain" showHeader={false} className="mt-6" />
        </div>
        <div className="min-w-0 p-6 sm:p-10">
          <RefillStatus />
        </div>
      </div>
    </section>
  );
};

export default CounterTools;
