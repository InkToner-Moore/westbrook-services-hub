import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Printer, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "@/hooks/use-toast";

const StaffLogin = () => {
  const { themeClasses } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast({
        title: "Login successful",
        description: "Welcome to the staff portal",
      });
      navigate("/staff/dashboard");
    } else {
      toast({
        title: "Login failed",
        description: result.error || "Invalid email or password",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-500 ${themeClasses.background}`}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse transition-all duration-500 ${themeClasses.backgroundFloating.purple}`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000 transition-all duration-500 ${themeClasses.backgroundFloating.blue}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-500 transition-all duration-500 ${themeClasses.backgroundFloating.indigo}`}></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back to public site link */}
        <Link 
          to="/" 
          className={`inline-flex items-center space-x-2 transition-colors mb-6 group ${themeClasses.text.secondary} hover:${themeClasses.text.primary}`}
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to public site</span>
        </Link>

        <Card className={`backdrop-blur-xl shadow-2xl transition-all duration-500 ${themeClasses.card.primary}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-blue-400 to-indigo-600 p-4 rounded-xl shadow-2xl">
                <Printer className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className={`text-2xl font-bold transition-all duration-500 ${themeClasses.text.primary}`}>Staff Portal</CardTitle>
            <CardDescription className={`transition-all duration-500 ${themeClasses.text.secondary}`}>
              Sign in to access the staff dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className={`h-12 transition-all duration-500 ${themeClasses.input}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className={`font-medium transition-all duration-500 ${themeClasses.text.primary}`}>Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className={`h-12 pr-12 transition-all duration-500 ${themeClasses.input}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-1 top-1 h-10 w-10 transition-all duration-300 ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className={`w-full h-12 font-bold rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 ${themeClasses.button.primary} ${themeClasses.interactive.focus}`}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className={`text-sm transition-all duration-500 ${themeClasses.text.secondary}`}>
                Need help accessing your account? Contact the manager.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffLogin;