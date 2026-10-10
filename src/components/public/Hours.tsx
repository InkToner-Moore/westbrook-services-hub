import Backdrop from "./Backdrop";
import { useEffect, useRef, useState } from "react";
import { calgaryNow, openState, WEEK, formatHour } from "@/lib/storeInfo";

const Hours = () => {
  const [now, setNow] = useState(() => calgaryNow());
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(calgaryNow()), 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);
  const status = openState(now);

  return (
    <section
      ref={ref}
      className={
        `pub-layer-section pub-hours border-t border-pub-edge py-16 sm:py-24 grid lg:grid-cols-12 gap-8 lg:gap-12 ` +
        (visible ? "pub-hours-visible" : "")
      }
    >
      <Backdrop
        items={[
          { kind: "tag-purolator", size: 190, top: "60%", left: "1%", rotate: -6, speed: 0.05, hideBelow: "lg" },
          { kind: "drop", size: 200, bottom: "-70px", right: "-150px", rotate: -10, speed: -0.04 },
        ]}
      />
      <div className="lg:col-span-4">
        <h2 className="pub-section-title font-display font-medium">Hours</h2>
        <p className="mt-5 flex items-start gap-2 text-base font-medium">
          <span
            className={`mt-2 h-2 w-2 shrink-0 rounded-full ${status.open ? "bg-pub-open" : "bg-pub-muted"}`}
          />
          {status.label}
        </p>
        <p className="mt-4 hidden max-w-[28ch] text-pub-muted lg:block">Open 7 days a week.</p>
      </div>
      <dl className="lg:col-span-8 min-w-0">
        {[1, 2, 3, 4, 5, 6, 0].map((weekday, index) => {
          const day = WEEK[weekday];
          const today = weekday === now.weekday;

          return (
            <div key={day.day} className="pub-hour-row border-b border-pub-edge py-4">
              <dt className={today ? "font-medium text-pub-ink" : "text-pub-muted"}>
                {day.day}
                {today && <span className="ml-2 text-xs text-pub-accent">Today</span>}
              </dt>
              <dd className="pub-hour-time font-mono tabular-nums text-sm whitespace-nowrap">
                {formatHour(day.open)} to {formatHour(day.close)}
              </dd>
              <dd aria-hidden="true" className="pub-hour-track relative h-3 rounded-full bg-pub-sunk">
                <span
                  className={
                    `pub-hour-bar absolute inset-y-0 rounded-full ` +
                    (today ? "bg-pub-accent" : "bg-pub-ink opacity-[0.22]")
                  }
                  style={{
                    left: `${((day.open - 10) / 11) * 100}%`,
                    width: `${((day.close - day.open) / 11) * 100}%`,
                    animationDelay: `${index * 50}ms`,
                  }}
                />
                {today && now.minutes >= 600 && now.minutes <= 1260 && (
                  <span
                    className="absolute top-1/2 h-[26px] w-0.5 -translate-y-1/2 -translate-x-1/2 bg-pub-ink"
                    style={{ left: `${((now.minutes - 600) / 660) * 100}%` }}
                  />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
};

export default Hours;
