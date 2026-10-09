import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { openState, PHONE_HREF, MAPS_URL } from "@/lib/storeInfo";
import ServiceArt from "./ServiceArt";

const services = [
  { kind: "cartridge", label: "Ink & toner" },
  { kind: "drop", label: "Refills" },
  { kind: "key", label: "Key cutting" },
  { kind: "parcel", label: "Shipping" },
] as const;

const Hero = () => {
  const [status, setStatus] = useState(() => openState());

  useEffect(() => {
    const timer = window.setInterval(() => setStatus(openState()), 60000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="pt-12 sm:pt-20 pb-14 sm:pb-20">
      <p className="pub-hero-status flex items-center gap-2 text-base font-medium">
        <span className={`h-2 w-2 rounded-full ${status.open ? "bg-pub-open" : "bg-pub-muted"}`} />
        {status.label}
      </p>
      <div className="pub-hero-layout">
        <div className="pub-scan relative mt-7">
          <h1 className="pub-hero-title font-display font-medium">
            <span className="block">Ink, Toner</span>
            <span className="block">&amp; Moore</span>
          </h1>
          <span className="pub-scan-bar" aria-hidden="true" />
        </div>
        <nav className="pub-hero-services mt-10 lg:mt-0 lg:shrink-0" aria-label="Services">
          <ul className="grid grid-cols-4 gap-3 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-8">
            {services.map((service) => (
              <li key={service.kind}>
                <a
                  href={`#service-${service.kind}`}
                  className={`pub-hero-service pub-hero-service-${service.kind} flex min-h-11 min-w-11 flex-col items-center lg:items-start`}
                >
                  <div className="pub-hero-service-art text-pub-ink">
                    <ServiceArt kind={service.kind} />
                  </div>
                  <span className="mt-2 text-sm sm:text-base font-medium text-pub-ink text-center lg:text-left">
                    {service.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="pub-hero-copy mt-8 max-w-[44ch] text-lg sm:text-xl text-pub-muted">
          Printing, ink and toner, key cutting, and shipping. Your neighbourhood counter inside Westbrook Mall.
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
      </div>
    </section>
  );
};

export default Hero;
