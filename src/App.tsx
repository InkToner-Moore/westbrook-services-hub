import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PublicHome from "./pages/PublicHome";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import StaffTracking from "./pages/StaffTracking";
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
            <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900 flex items-center justify-center">
              <div className="text-center text-white">
                <h1 className="text-4xl font-bold mb-4">Receipt Generator</h1>
                <p className="text-xl text-blue-200">Coming Soon</p>
              </div>
            </div>
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
