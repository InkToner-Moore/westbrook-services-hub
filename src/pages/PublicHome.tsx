import PublicHeader from "@/components/public/PublicHeader";
import Hero from "@/components/public/Hero";
import CounterTools from "@/components/public/CounterTools";
import Services from "@/components/public/Services";
import Hours from "@/components/public/Hours";
import Location from "@/components/public/Location";
import PublicFooter from "@/components/public/PublicFooter";
import "@/styles/public.css";

const PublicHome = () => {
  return (
    <div className="public-site min-h-screen">
      <PublicHeader />
      <main className="pub-container">
        <Hero />
        <CounterTools />
        <Services />
        <Hours />
        <Location />
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicHome;
