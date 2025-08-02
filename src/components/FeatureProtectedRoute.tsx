import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureProtectedRouteProps {
  children: React.ReactNode;
  featurePath: string;
  moduleTitle: string;
  moduleIcon?: React.ReactNode;
}

const FeatureProtectedRoute = ({ 
  children, 
  featurePath, 
  moduleTitle, 
  moduleIcon 
}: FeatureProtectedRouteProps) => {
  const { user, loading } = useAuth();
  // All features are now enabled since system settings was removed
  const isFeatureEnabled = () => true;
  const { themeClasses } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-all duration-500 ${themeClasses.background}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${themeClasses.text.primary}`}></div>
          <p className={themeClasses.text.primary}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/staff" replace />;
  }

  if (!isFeatureEnabled()) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-500 ${themeClasses.background}`}>
        <Card className={`max-w-md w-full transition-all duration-500 ${themeClasses.card.primary}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-xl ${themeClasses.card.secondary}`}>
                {moduleIcon || <X className={`h-8 w-8 ${themeClasses.text.muted}`} />}
              </div>
            </div>
            <CardTitle className={`text-2xl font-bold ${themeClasses.text.primary}`}>
              {moduleTitle} Disabled
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className={`${themeClasses.text.secondary}`}>
              This module is currently disabled in system settings.
            </p>
            <p className={`text-sm ${themeClasses.text.muted}`}>
              Contact your administrator to enable this feature, or check the settings panel.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => window.history.back()}
                variant="ghost"
                className={`flex-1 ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button
                onClick={() => window.location.href = '/staff/dashboard'}
                className={`flex-1 ${themeClasses.button.primary} ${themeClasses.interactive.focus}`}
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureProtectedRoute;