import { Link } from "react-router-dom";

const PublicFooter = () => {
  return (
    <footer className="border-t border-pub-edge py-12 sm:py-16">
      <div className="pub-container">
        <p className="pub-footer-wordmark font-display font-medium">Ink, Toner &amp; Moore</p>
        <div className="mt-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-pub-muted">
          <p>Westbrook Mall, Calgary. Open 7 days a week.</p>
          <Link to="/staff" className="pub-link inline-flex min-h-11 items-center self-start">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
