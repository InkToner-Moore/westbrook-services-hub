
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Target, Sun, Moon } from "lucide-react";

const Index = () => {
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 animate-pulse ${
          isDark ? 'bg-purple-500' : 'bg-blue-400'
        } blur-3xl`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-20 animate-pulse ${
          isDark ? 'bg-blue-500' : 'bg-purple-400'
        } blur-3xl`} style={{ animationDelay: '2s' }}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10 animate-pulse ${
          isDark ? 'bg-emerald-500' : 'bg-pink-400'
        } blur-2xl`} style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Theme toggle */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="icon"
          className={`${
            isDark 
              ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
              : 'bg-black/10 border-black/20 text-black hover:bg-black/20'
          } backdrop-blur-sm transition-all duration-300`}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <Badge className={`px-4 py-2 text-sm font-medium ${
              isDark 
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-200 border-purple-500/30' 
                : 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-700 border-purple-500/20'
            } backdrop-blur-sm`}>
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Innovation
            </Badge>
          </div>
          
          <h1 className={`text-6xl md:text-8xl font-bold mb-6 ${
            isDark ? 'text-white' : 'text-gray-900'
          } tracking-tight`}>
            <span className={`bg-gradient-to-r ${
              isDark 
                ? 'from-purple-400 via-pink-400 to-blue-400' 
                : 'from-purple-600 via-pink-600 to-blue-600'
            } bg-clip-text text-transparent animate-pulse`}>
              Transform
            </span>
            <br />
            Your Ideas
          </h1>
          
          <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Harness the power of cutting-edge AI to revolutionize your workflow, 
            boost creativity, and unlock unprecedented possibilities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className={`px-8 py-4 text-lg font-semibold rounded-full ${
                isDark 
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' 
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
              } text-white shadow-2xl transform hover:scale-105 transition-all duration-300 group`}
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className={`px-8 py-4 text-lg font-semibold rounded-full ${
                isDark 
                  ? 'border-white/30 text-white hover:bg-white/10' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } backdrop-blur-sm transition-all duration-300 hover:scale-105`}
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: Zap,
              title: "Lightning Fast",
              description: "Process complex tasks in seconds with our advanced AI algorithms"
            },
            {
              icon: Target,
              title: "Precision Focused",
              description: "Achieve pinpoint accuracy with intelligent automation and smart insights"
            },
            {
              icon: Sparkles,
              title: "Creative Boost",
              description: "Unlock new levels of creativity with AI-powered suggestions and solutions"
            }
          ].map((feature, index) => (
            <Card 
              key={index} 
              className={`${
                isDark 
                  ? 'bg-white/5 border-white/10 text-white' 
                  : 'bg-white/70 border-gray-200 text-gray-900'
              } backdrop-blur-xl hover:scale-105 transition-all duration-300 shadow-2xl group cursor-pointer`}
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <CardHeader className="text-center pb-4">
                <div className={`mx-auto w-16 h-16 rounded-full ${
                  isDark 
                    ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20' 
                    : 'bg-gradient-to-br from-purple-500/10 to-blue-500/10'
                } flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-8 h-8 ${
                    isDark ? 'text-purple-300' : 'text-purple-600'
                  }`} />
                </div>
                <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className={`text-center text-lg ${
                  isDark ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className={`text-center p-12 rounded-3xl ${
          isDark 
            ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-white/10' 
            : 'bg-gradient-to-r from-purple-50/80 to-blue-50/80 border border-gray-200'
        } backdrop-blur-xl shadow-2xl`}>
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Ready to Get Started?
          </h2>
          <p className={`text-xl mb-8 max-w-2xl mx-auto ${
            isDark ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Join thousands of innovators who are already transforming their work with our AI platform.
          </p>
          <Button 
            size="lg"
            className={`px-12 py-4 text-xl font-bold rounded-full ${
              isDark 
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600' 
                : 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-500 hover:to-teal-500'
            } text-white shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse`}
          >
            Start Your Journey
          </Button>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style>
        {`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in {
            animation: fade-in 1s ease-out;
          }
        `}
      </style>
    </div>
  );
};

export default Index;
