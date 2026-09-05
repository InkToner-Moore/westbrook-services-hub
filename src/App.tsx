import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PublicHome from "./pages/PublicHome";
import StaffLogin from "./pages/StaffLogin";
import StaffTracking from "./pages/StaffTracking";
import StaffReceipts from "./pages/StaffReceipts";
import StaffCartridges from "./pages/StaffCartridges";
import StaffDirectory from "./pages/StaffDirectory";
import StaffNotes from "./pages/StaffNotes";
import StaffInventory from "./pages/StaffInventory";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";
import { AiModeProvider } from "./ai/context";
import StaffShell from "./components/shell/StaffShell";
import AiChatPane from "./components/shell/AiChatPane";
import { registerReceiptSeams } from "./ai/actions/label";

// Register the real 4x6 label builder once at startup. Until this runs, the
// compound "also print a 4x6 label" attachment degrades to a friendly no-op.
registerReceiptSeams();

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public portal */}
      <Route path="/" element={<PublicHome />} />

      {/* Staff portal */}
      <Route path="/staff">
        {/* Bare /staff: login when signed out, jump to AI Mode when signed in. */}
        <Route
          index
          element={user ? <Navigate to="/staff/ai" replace /> : <StaffLogin />}
        />

        {/* Everything below renders inside the three-pane staff shell. The tile
            rail and artifact rail stay put; the center pane is the active tool. */}
        <Route
          element={
            <ProtectedRoute>
              <StaffShell />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Navigate to="/staff/ai" replace />} />
          <Route path="ai" element={<AiChatPane />} />
          <Route path="tracking" element={<StaffTracking />} />
          <Route path="receipts" element={<StaffReceipts />} />
          <Route path="cartridges" element={<StaffCartridges />} />
          <Route path="directory" element={<StaffDirectory />} />
          <Route path="notes" element={<StaffNotes />} />
          <Route path="inventory" element={<StaffInventory />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Match Vite's base path (set in vite.config.ts) so routing works
            whether the app is served at the site root or under a subpath. */}
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          {/* AI Mode state (chat, artifact, open receipt) is shared across the
              staff shell, so the provider wraps all routes. It renders nothing on
              public routes or when signed out. */}
          <AiModeProvider>
            <AppRoutes />
          </AiModeProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
