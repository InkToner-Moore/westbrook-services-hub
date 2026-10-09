import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { openState, PHONE_HREF, MAPS_URL } from "@/lib/storeInfo";
import KeyRule from "./KeyRule";

const Hero = () => {
  const [status, setStatus] = useState(() => openState());

  useEffect(() => {
    const timer = window.setInterval(() => setStatus(openState()), 60000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="pt-12 sm:pt-20">
      <p className="pub-hero-status flex items-center gap-2 text-base font-medium">
        <span className={`h-2 w-2 rounded-full ${status.open ? "bg-pub-open" : "bg-pub-muted"}`} />
        {status.label}
      </p>
      <div className="pub-scan relative mt-7">
        <h1 className="pub-hero-title font-display font-medium">
          Printing, ink and toner, keys, and shipping.
        </h1>
        <span className="pub-scan-bar" aria-hidden="true" />
      </div>
      <p className="pub-hero-copy mt-6 max-w-[44ch] text-lg sm:text-xl text-pub-muted">
        Your neighbourhood counter inside Westbrook Mall. Drop by, call, or use the tools below.
      </p>
      <div className="pub-hero-actions mt-8 flex flex-wrap gap-3">
        <a className="pub-button bg-pub-ink text-pub-counter" href={PHONE_HREF}>
          <Phone size={18} aria-hidden="true" />
          Call (403) 686-2835
        </a>
        <a className="pub-button pub-secondary" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
          Get directions
        </a>
      </div>
      <div className="mt-14 sm:mt-20">
        <KeyRule />
      </div>
    </section>
  );
};

export default Hero;
