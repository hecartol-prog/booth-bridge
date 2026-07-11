import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { initSentry } from '@/monitoring/sentryInit'
import { installAppInstrumentation } from '@/monitoring/installAppInstrumentation'
import { SentryErrorBoundary } from '@/monitoring/SentryErrorBoundary'

initSentry()
installAppInstrumentation()

// Service Worker: unregister in dev, register in production
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) reg.unregister();
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <SentryErrorBoundary>
    <App />
  </SentryErrorBoundary>
)
