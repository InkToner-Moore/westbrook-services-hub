import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";

const NotFound = () => {
  const { themeClasses } = useTheme();

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 ${themeClasses.background}`}>
      <div className={`w-full max-w-md rounded-xl border p-6 text-center ${themeClasses.card.primary}`}>
        <h1 className={`text-2xl font-semibold tracking-tight ${themeClasses.text.primary}`}>
          We couldn't find that page
        </h1>
        <p className={`mt-2 text-[15px] leading-relaxed ${themeClasses.text.secondary}`}>
          The link may be old or mistyped. Tracking, refill status, and our hours are on the home page.
        </p>
        <Link
          to="/"
          className={`mt-5 inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${themeClasses.button.primary}`}
        >
          Back to the home page
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
