import Backdrop from "./Backdrop";
import { ExternalLink } from "lucide-react";
import storeMap from "@/assets/store-map.png";
import { MAPS_URL, PHONE_DISPLAY, PHONE_HREF, EMAIL } from "@/lib/storeInfo";

const Location = () => {
  return (
    <section className="pub-layer-section grid lg:grid-cols-12 gap-10 lg:gap-16 border-t border-pub-edge py-16 sm:py-24">
      <Backdrop
        items={[
          { kind: "parcel", size: 240, top: "6%", left: "41%", rotate: -6, speed: 0.05, hideBelow: "lg" },
        ]}
      />
      <div className="lg:col-span-7 min-w-0">
        <h2 className="pub-section-title font-display font-medium">Find us</h2>
        <p className="mt-6 font-display font-medium text-2xl max-w-[28ch]">
          Inside Westbrook Mall, in front of AMA.
        </p>
        <dl className="mt-8">
          {[
            { term: "Address", value: "Westbrook Mall, Calgary", href: MAPS_URL },
            { term: "Phone", value: PHONE_DISPLAY, href: PHONE_HREF },
            { term: "Email", value: EMAIL, href: `mailto:${EMAIL}` },
          ].map((row) => (
            <div key={row.term} className="grid sm:grid-cols-[6rem_1fr] border-t border-pub-edge py-3">
              <dt className="text-pub-muted">{row.term}</dt>
              <dd className="min-w-0">
                <a
                  href={row.href}
                  target={row.term === "Address" ? "_blank" : undefined}
                  rel={row.term === "Address" ? "noopener noreferrer" : undefined}
                  className={
                    `pub-link inline-flex min-h-11 items-center text-lg break-all ` +
                    (row.term === "Phone" ? "font-mono tabular-nums" : "")
                  }
                >
                  {row.value}
                </a>
              </dd>
            </div>
          ))}
        </dl>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="pub-button pub-secondary mt-6"
        >
          Get directions
        </a>
      </div>
      <a
        href={MAPS_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open our location in Google Maps"
        className={
          "pub-map relative self-start lg:col-span-5 rounded-2xl overflow-hidden border" + " border-pub-edge"
        }
      >
        <img
          src={storeMap}
          alt="Map showing Ink, Toner & Moore inside Westbrook Mall, Calgary"
          loading="lazy"
          width="817"
          height="700"
          className="aspect-[817/700] w-full object-cover"
        />
        <span
          className={
            "pub-map-caption absolute inset-x-0 bottom-0 flex items-center gap-2 px-5 py-3" +
            " bg-pub-ink text-pub-counter text-sm"
          }
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open in Google Maps
        </span>
      </a>
    </section>
  );
};

export default Location;
