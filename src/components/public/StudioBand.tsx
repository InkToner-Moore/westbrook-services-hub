import { ExternalLink } from "lucide-react";
import { STUDIO_URL } from "@/lib/storeInfo";

// Three overlapping plates in the process inks, a nod to the studio site's look.
const PLATES = [
  { color: "#00aeef", left: "0" },
  { color: "#ec008c", left: "1.1em" },
  { color: "#ffd800", left: "2.2em" },
];

const StudioBand = () => (
  <section aria-labelledby="studio-heading" className="border-t border-pub-edge py-12 sm:py-16">
    <div
      className={
        "flex flex-col gap-4 rounded-xl border border-pub-edge border-l-4 border-l-pub-accent" +
        " relative bg-pub-paper p-5 sm:flex-row sm:items-center sm:gap-10 sm:p-8"
      }
    >
      <span aria-hidden="true" className="absolute right-5 top-5 block h-[3em] w-[4.4em] text-[0.6667rem] sm:relative sm:shrink-0 sm:text-base">
        {PLATES.map((plate) => (
          <span
            key={plate.color}
            className="absolute top-0 block h-[3em] w-[3em] rounded-full mix-blend-multiply dark:mix-blend-screen"
            style={{ background: plate.color, left: plate.left, opacity: 0.9 }}
          />
        ))}
      </span>
      <div className="min-w-0 sm:flex-1">
        <h2 id="studio-heading" className="font-display font-medium text-2xl sm:text-3xl pr-16 sm:pr-0">
          Need a website for your business?
        </h2>
        <p className="mt-2 max-w-[48ch] text-pub-muted">
          Our studio builds simple websites and tools for small businesses in Calgary, from this same counter.
        </p>
      </div>
      <a
        href={STUDIO_URL}
        className="pub-button bg-pub-ink text-pub-counter self-start sm:self-center"
      >
        Visit the studio
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    </div>
  </section>
);

export default StudioBand;
