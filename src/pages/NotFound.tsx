import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const NotFound = () => {
  const { themeClasses } = useTheme();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-pub-counter">
      <div className="w-full max-w-md rounded-xl border p-6 text-center bg-pub-paper border-pub-edge">
        <h1 className="font-display font-semibold text-pub-ink text-2xl tracking-tight">
          We couldn't find that page
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-pub-muted">
          The link may be old or mistyped. Tracking, refill status, and our hours are on the home page.
        </p>
        <Link
          to="/"
          className={`mt-5 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pub-accent focus-visible:ring-offset-2 ${themeClasses.button.primary}`}
        >
          Back to the home page
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
