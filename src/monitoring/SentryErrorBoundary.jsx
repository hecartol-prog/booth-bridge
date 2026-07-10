/**
 * RC10.6 — React rendering error boundary with Sentry reporting.
 */

import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";

function Fallback({ error, resetError }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full rounded-xl border bg-white p-6 shadow-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="text-sm text-slate-600">
          An unexpected rendering error occurred. The incident has been reported.
        </p>
        {import.meta.env.DEV && error?.message && (
          <pre className="text-left text-xs bg-slate-100 p-3 rounded overflow-auto text-red-700">
            {error.message}
          </pre>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" onClick={resetError}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

export function SentryErrorBoundary({ children }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <Fallback error={error} resetError={resetError} />
      )}
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
