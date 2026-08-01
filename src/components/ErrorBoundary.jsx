import React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { captureRuntimeError } from "@/monitoring/sentryErrors";

/**
 * Route-level error boundary. Isolates render failures so one page/layout
 * crash does not unmount the entire app (SentryErrorBoundary remains outermost).
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    captureRuntimeError(error, {
      subsystem: "UI",
      category: "route_error_boundary",
      component: this.props.name || "ErrorBoundary",
      metadata: { componentStack: info?.componentStack },
    });
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error,
          resetError: () => this.setState({ error: null }),
        });
      }
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border bg-card p-6 shadow-sm space-y-4 text-center">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              This section failed to load. You can reload the page or try again.
            </p>
            {import.meta.env.DEV && this.state.error?.message && (
              <pre className="text-left text-xs bg-muted p-3 rounded overflow-auto text-destructive">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()}>Reload</Button>
              <Button variant="outline" onClick={() => this.setState({ error: null })}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/** Resets the boundary when the route path changes. */
export function RouteErrorBoundary({ children, name }) {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname} name={name}>
      {children}
    </ErrorBoundary>
  );
}
