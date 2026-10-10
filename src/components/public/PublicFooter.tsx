import { Link } from "react-router-dom";
import { STUDIO_URL } from "@/lib/storeInfo";

const PublicFooter = () => {
  return (
    <footer className="border-t border-pub-edge py-10">
      <div className="pub-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-pub-muted">
          <div>
            <p className="font-display font-medium text-xl text-pub-ink">Ink, Toner &amp; Moore</p>
            <p>Westbrook Mall, Calgary. Open 7 days a week.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 self-start">
            <a href={STUDIO_URL} className="pub-link inline-flex min-h-11 items-center">
              Websites for small businesses
            </a>
            <Link to="/staff" className="pub-link inline-flex min-h-11 items-center">
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
