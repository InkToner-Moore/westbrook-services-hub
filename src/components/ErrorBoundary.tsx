import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRefresh = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.VITE_NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900 flex items-center justify-center p-4">
          <Card className="backdrop-blur-xl bg-white/15 border-white/30 shadow-2xl max-w-2xl w-full">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <CardTitle className="text-white text-2xl mb-2">
                Oops! Something went wrong
              </CardTitle>
              <p className="text-blue-200">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {isDev && this.state.error && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                  <h4 className="text-red-300 font-semibold mb-2">Error Details (Development Mode)</h4>
                  <pre className="text-xs text-red-200 overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-red-300 text-sm cursor-pointer">Stack Trace</summary>
                      <pre className="text-xs text-red-200 mt-2 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRefresh}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="flex-1 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-xl"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <div className="text-center text-sm text-blue-300">
                <p>If this problem persists, please contact support:</p>
                <p className="font-semibold">(403) 686-2835</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;