import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicHome from "./pages/PublicHome";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import StaffTracking from "./pages/StaffTracking";
import StaffReceipts from "./pages/StaffReceipts";
import StaffCartridges from "./pages/StaffCartridges";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";

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
            <StaffTracking />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/staff/receipts" 
        element={
          <ProtectedRoute>
            <StaffReceipts />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/staff/cartridges" 
        element={
          <ProtectedRoute>
            <StaffCartridges />
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
