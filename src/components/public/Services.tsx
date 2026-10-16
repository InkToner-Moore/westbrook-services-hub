import ServiceArt from "./ServiceArt";
import { STUDIO_URL } from "@/lib/storeInfo";

const services = [
  {
    title: "Ink & toner cartridges",
    description: "Compatible and brand-name cartridges for all major printer brands.",
    kind: "cartridge",
  },
  {
    title: "Ink jet refills",
    description: "Bring your empty cartridge in. Call first to check that we can refill it.",
    kind: "drop",
  },
  {
    title: "Key cutting",
    description: "House, mailbox, and car keys. Call first to check that we have your blank.",
    kind: "key",
  },
  { title: "Shipping", description: "Authorized drop-off for UPS, FedEx, and Purolator.", kind: "parcel" },
  {
    title: "Websites for small businesses",
    description: "Simple websites and tools for local businesses, from our studio.",
    kind: "site",
    href: STUDIO_URL,
    linkText: "Visit the studio",
  },
] as const;

const Services = () => {
  return (
    <section className="pb-16 sm:pb-24">
      <h2 className="pub-section-title font-display font-medium">What we do</h2>
      <ul className="mt-8">
        {services.map((service) => (
          <li
            key={service.kind}
            id={`service-${service.kind}`}
            className={
              `pub-service pub-service-${service.kind} grid lg:grid-cols-12 ` +
              "gap-4 lg:gap-6 items-center border-t last:border-b border-pub-edge " +
              "py-8 sm:py-10 md:py-12"
            }
          >
            <h3 className="pub-service-title font-display font-medium lg:col-span-6">
              {service.title}
            </h3>
            {/* On a phone the drawing sits beside the description, so the title has the full width. */}
            <div className="flex items-start justify-between gap-4 lg:contents">
              <div className="max-w-[42ch] lg:col-span-4">
                <p className="text-pub-muted">{service.description}</p>
                {"href" in service && (
                  <a href={service.href} className="pub-link mt-1 inline-flex min-h-11 items-center font-medium">
                    {service.linkText}
                  </a>
                )}
              </div>
              <div
                className={
                  "pub-service-art h-[72px] w-[72px] shrink-0 md:h-24 md:w-24 lg:col-span-2" +
                  " lg:h-32 lg:w-32 lg:justify-self-end text-pub-ink"
                }
              >
                <ServiceArt kind={service.kind} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-[60ch] text-pub-muted">
        <span className="font-medium text-pub-ink">Also at the counter:</span> printing, faxing, scanning,
        photocopying, card lamination, and cartridge recycling.
      </p>
    </section>
  );
};

export default Services;
