import { useFormClasses, Field } from "@/components/shell/FormKit";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useStaffAppMeta } from "@/hooks/useStaffAppMeta";
import { toast } from "@/hooks/use-toast";

const StaffLogin = () => {
  useStaffAppMeta();
  const { themeClasses } = useTheme();
  const fc = useFormClasses();
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
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors bg-pub-counter">
      <div className="relative z-10 w-full max-w-md">
        {/* Back to public site link */}
        <Link 
          to="/" 
          className="inline-flex items-center space-x-2 transition-colors mb-6 group text-pub-muted hover:text-pub-ink"
        >
          <ArrowLeft className="h-4 w-4 transition-transform" />
          <span>Back to public site</span>
        </Link>

        <Card className="bg-pub-paper border border-pub-edge rounded-2xl shadow-none">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-pub-sunk border border-pub-edge p-4 rounded-xl">
                <Printer className="h-8 w-8 text-pub-ink" />
              </div>
            </div>
            <p className="font-display text-4xl font-semibold text-pub-ink">Ink, Toner &amp; Moore</p>
            <CardTitle className="font-display text-2xl font-semibold text-pub-ink">Staff Portal</CardTitle>
            <CardDescription className="transition-colors text-pub-muted">
              Sign in to access the staff dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Email" htmlFor="email" required>
                <Input
                  id="email"
                  name="email"
                  autoComplete="username"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className={fc.input}
                />
              </Field>
              
              <Field label="Password" htmlFor="password" required>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className={`${fc.input} pr-12`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`absolute right-1 top-1 h-10 w-10 transition-colors ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </Field>

              <Button
                type="submit"
                disabled={loading}
                className={`${fc.primary} sm:w-full ${themeClasses.interactive.focus}`}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm transition-colors text-pub-muted">
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