import React from "react";
import { Button } from "@/components/ui/button";

export default class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Auth page crashed:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center space-y-3">
          <h1 className="text-xl font-semibold">Authentication is temporarily unavailable</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong. Please refresh the page or try again shortly.
          </p>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
