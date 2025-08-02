import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PublicHome from "./pages/PublicHome";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import StaffTracking from "./pages/StaffTracking";
import StaffReceipts from "./pages/StaffReceipts";
import StaffCartridges from "./pages/StaffCartridges";
import StaffDirectory from "./pages/StaffDirectory";
import StaffNotes from "./pages/StaffNotes";
import ProtectedRoute from "./components/ProtectedRoute";
import FeatureProtectedRoute from "./components/FeatureProtectedRoute";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";
import { Package, Receipt, Printer, StickyNote } from "lucide-react";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicHome />} />
      
      {/* Staff Authentication */}
      <Route 
        path="/staff" 
        element={user ? <Navigate to="/staff/dashboard" replace /> : <StaffLogin />} 
      />
      
      {/* Protected Staff Routes */}
      <Route 
        path="/staff/dashboard" 
        element={
          <ProtectedRoute>
            <StaffDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Placeholder for future staff routes */}
      <Route 
        path="/staff/tracking" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute 
              featurePath="modules.packageTracking.enabled"
              moduleTitle="Package Tracking"
              moduleIcon={<Package className="h-8 w-8 text-blue-500" />}
            >
              <StaffTracking />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/staff/receipts" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute 
              featurePath="modules.receiptGenerator.enabled"
              moduleTitle="Receipt Generator"
              moduleIcon={<Receipt className="h-8 w-8 text-green-500" />}
            >
              <StaffReceipts />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/staff/cartridges" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute 
              featurePath="modules.cartridgeManager.enabled"
              moduleTitle="Cartridge Manager"
              moduleIcon={<Printer className="h-8 w-8 text-purple-500" />}
            >
              <StaffCartridges />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />
      
      
      <Route 
        path="/staff/directory" 
        element={
          <ProtectedRoute>
            <StaffDirectory />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/staff/notes" 
        element={
          <ProtectedRoute>
            <FeatureProtectedRoute 
              featurePath="modules.notes.enabled"
              moduleTitle="Notes System"
              moduleIcon={<StickyNote className="h-8 w-8 text-yellow-500" />}
            >
              <StaffNotes />
            </FeatureProtectedRoute>
          </ProtectedRoute>
        } 
      />
      
      
      
      {/* Catch-all route */}
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
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
