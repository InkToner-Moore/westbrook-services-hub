import { useEffect, useRef } from "react";
import Conveyor from "@/components/public/Conveyor";
import PublicHeader from "@/components/public/PublicHeader";
import Hero from "@/components/public/Hero";
import CounterTools from "@/components/public/CounterTools";
import Services from "@/components/public/Services";
import Hours from "@/components/public/Hours";
import Location from "@/components/public/Location";
import PublicFooter from "@/components/public/PublicFooter";
import "@/styles/public.css";

const PublicHome = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const writeScroll = () => {
      root?.style.setProperty("--pub-scroll", String(window.scrollY));
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(writeScroll);
    };
    // Respond to motion preferences changing while the page is open, too.
    const syncMotion = () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      frame = 0;
      if (motion.matches) {
        root?.style.removeProperty("--pub-scroll");
      } else {
        writeScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
      }
    };
    syncMotion();
    motion.addEventListener("change", syncMotion);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      motion.removeEventListener("change", syncMotion);
      root?.style.removeProperty("--pub-scroll");
    };
  }, []);

  return (
    <div ref={rootRef} className="public-site min-h-screen">
      <PublicHeader />
      <main className="pub-container">
        <Hero />
        <CounterTools />
        <Services />
        <Hours />
        <Location />
      </main>
      <Conveyor />
      <PublicFooter />
    </div>
  );
};

export default PublicHome;
