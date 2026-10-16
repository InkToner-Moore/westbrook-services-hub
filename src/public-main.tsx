import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { loadShopSettings } from "@/lib/shopSettings";
import PublicHome from "@/pages/PublicHome";
import "./index.css";

const queryClient = new QueryClient();

// "/index.html" is this same page; send it to "/" rather than back to the server,
// which would serve this build again and loop.
const IndexRoute = () => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/", search, hash }} replace />;
};

export const ServerRoute = () => {
  useEffect(() => {
    window.location.replace(window.location.pathname + window.location.search + window.location.hash);
  }, []);

  return null;
};

void loadShopSettings();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/index.html" element={<IndexRoute />} />
            <Route path="*" element={<ServerRoute />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
