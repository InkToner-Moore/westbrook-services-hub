import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { PHONE_DISPLAY, PHONE_HREF } from "@/lib/storeInfo";

const PublicHeader = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`pub-header sticky top-0 z-40 border-b ${scrolled ? "border-pub-edge" : "border-transparent"}`}
    >
      <div className="pub-container flex items-center justify-between gap-2 py-4">
        <Link
          to="/"
          aria-label="Ink, Toner & Moore, home"
          className="font-display text-xl font-semibold leading-tight min-h-11 flex items-center"
        >
          Ink, Toner &amp; Moore
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">
          <a
            href={PHONE_HREF}
            aria-label="Call (403) 686-2835"
            className="pub-phone flex h-11 min-w-11 items-center justify-center gap-2 rounded-full"
          >
            <Phone size={18} aria-hidden="true" />
            <span className="pub-phone-text hidden sm:inline tabular-nums">{PHONE_DISPLAY}</span>
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="pub-ghost flex h-11 w-11 items-center justify-center rounded-full"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;
