import ServiceArt from "./ServiceArt";

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
              `pub-service pub-service-${service.kind} relative grid md:grid-cols-12 ` +
              "gap-4 md:gap-6 items-center border-t last:border-b border-pub-edge " +
              "py-8 sm:py-10 md:py-12"
            }
          >
            <h3 className="pub-service-title font-display font-medium pr-24 md:pr-0 md:col-span-5">
              {service.title}
            </h3>
            <p className="max-w-[42ch] pr-24 text-pub-muted md:col-span-5 md:pr-0">{service.description}</p>
            <div
              className={
                "pub-service-art absolute top-8 right-0 h-[72px] w-[72px] md:static md:col-span-2" +
                " md:h-32 md:w-32 md:justify-self-end text-pub-ink"
              }
            >
              <ServiceArt kind={service.kind} />
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
