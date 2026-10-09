import { Link } from "react-router-dom";

const PublicFooter = () => {
  return (
    <footer className="border-t border-pub-edge py-10">
      <div className="pub-container">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-pub-muted">
          <div>
            <p className="font-display font-medium text-xl text-pub-ink">Ink, Toner &amp; Moore</p>
            <p>Westbrook Mall, Calgary. Open 7 days a week.</p>
          </div>
          <Link to="/staff" className="pub-link inline-flex min-h-11 items-center self-start">
            Staff login
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
