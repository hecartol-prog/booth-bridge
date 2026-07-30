import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";
import OnboardedGuard from "@/components/OnboardedGuard";
import { DebugConsoleGate } from "@/debug/DebugConsoleGate";
import { SentryRouteTracker } from "@/monitoring/SentryRouteTracker";
import { SentryUserBridge } from "@/monitoring/SentryUserBridge";

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import AppLayout from "@/components/layout/AppLayout";
import AdminLayout from "@/components/layout/AdminLayout";

// App pages — lazy-loaded to keep initial auth/mobile bundles small.
const Onboarding = React.lazy(() => import("@/pages/Onboarding"));
const Home = React.lazy(() => import("@/pages/Home"));
const QRCodePage = React.lazy(() => import("@/pages/QRCode"));
const ScanQR = React.lazy(() => import("@/pages/ScanQR"));
const Connections = React.lazy(() => import("@/pages/Connections"));
const RFIInbox = React.lazy(() => import("@/pages/RFIInbox"));
const MyRFIs = React.lazy(() => import("@/pages/MyRFIs"));
const Meetings = React.lazy(() => import("@/pages/Meetings"));
const Products = React.lazy(() => import("@/pages/Products"));
const BusinessCard = React.lazy(() => import("@/pages/BusinessCard"));
const Notifications = React.lazy(() => import("@/pages/Notifications"));
const Catalogue = React.lazy(() => import("@/pages/Catalogue"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const SavedBooths = React.lazy(() => import("@/pages/SavedBooths"));
const MyLibrary = React.lazy(() => import("@/pages/MyLibrary"));
const CatalogLibrary = React.lazy(() => import("@/pages/CatalogLibrary"));
const EventDirectory = React.lazy(() => import("@/pages/EventDirectory"));
const ExhibitorDiscover = React.lazy(() => import("@/pages/ExhibitorDiscover"));
const OrganizerAnalytics = React.lazy(() => import("@/pages/OrganizerAnalytics"));
const SupplierCompare = React.lazy(() => import("@/pages/SupplierCompare"));
const IntegrationHub = React.lazy(() => import("@/pages/IntegrationHub"));
const LeadIntelligence = React.lazy(() => import("@/pages/LeadIntelligence"));
const ExhibitorAnalytics = React.lazy(() => import("@/pages/ExhibitorAnalytics"));
const PremiumBooth = React.lazy(() => import("@/pages/PremiumBooth"));
const OrganizerCommandCenter = React.lazy(() => import("@/pages/OrganizerCommandCenter"));
const NFCExchange = React.lazy(() => import("@/pages/NFCExchange"));
const NFCProfileView = React.lazy(() => import("@/pages/NFCProfileView"));
const NFCOrganizerPanel = React.lazy(() => import("@/pages/NFCOrganizerPanel"));
const OCRScanner = React.lazy(() => import("@/pages/OCRScanner"));
const ScannedContacts = React.lazy(() => import("@/pages/ScannedContacts"));
const BillingCenter = React.lazy(() => import("@/pages/BillingCenter"));
const AdminLogin = React.lazy(() => import("@/pages/AdminLogin"));
const EventReadinessCenter = React.lazy(() => import("@/pages/EventReadinessCenter"));
const ExhibitorSetupWizard = React.lazy(() => import("@/pages/ExhibitorSetupWizard"));
const LiveEventControlRoom = React.lazy(() => import("@/pages/LiveEventControlRoom"));
const EventSupportCenter = React.lazy(() => import("@/pages/EventSupportCenter"));

// Admin pages
const AdminDashboard = React.lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = React.lazy(() => import("@/pages/admin/AdminUsers"));
const AdminExhibitors = React.lazy(() => import("@/pages/admin/AdminExhibitors"));
const AdminProducts = React.lazy(() => import("@/pages/admin/AdminProducts"));
const AdminCatalogues = React.lazy(() => import("@/pages/admin/AdminCatalogues"));
const AdminEvents = React.lazy(() => import("@/pages/admin/AdminEvents"));
const AdminConnections = React.lazy(() => import("@/pages/admin/AdminConnections"));
const AdminRevenue = React.lazy(() => import("@/pages/admin/AdminRevenue"));
const AdminLeads = React.lazy(() => import("@/pages/admin/AdminLeads"));
const AdminMedia = React.lazy(() => import("@/pages/admin/AdminMedia"));
const AdminSettings = React.lazy(() => import("@/pages/admin/AdminSettings"));
const AdminDataQuality = React.lazy(() => import("@/pages/admin/AdminDataQuality"));
const AdminAuditLog = React.lazy(() => import("@/pages/admin/AdminAuditLog"));
const AdminSupportTickets = React.lazy(() => import("@/pages/admin/AdminSupportTickets"));
const AdminNFCValidation = React.lazy(() => import("@/pages/admin/AdminNFCValidation"));
const AdminGlobalSearch = React.lazy(() => import("@/pages/admin/AdminGlobalSearch"));
const AdminStressTest = React.lazy(() => import("@/pages/admin/AdminStressTest"));
const AdminMonitoring = React.lazy(() => import("@/pages/admin/AdminMonitoring"));
const AdminOCRReview = React.lazy(() => import("@/pages/admin/AdminOCRReview"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

const lazyPage = (element) => (
  <Suspense fallback={<PageLoader />}>
    {element}
  </Suspense>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      // Render login route — don't call navigateToLogin() during render (causes loops)
      return (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      );
    } else {
      // Unknown/network errors — show login so the app is still accessible
      return (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      );
    }
  }

  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Onboarding */}
      <Route
        element={
          <ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />
        }
      >
        <Route
          path="/onboarding"
          element={lazyPage(<Onboarding />)}
        />

        {/* Main app with layout */}
        <Route element={<OnboardedGuard><AppLayout /></OnboardedGuard>}>
          <Route path="/" element={lazyPage(<Home />)} />
          <Route path="/qr" element={lazyPage(<QRCodePage />)} />
          <Route path="/scan" element={lazyPage(<ScanQR />)} />
          <Route path="/connections" element={lazyPage(<Connections />)} />
          <Route path="/rfi-inbox" element={lazyPage(<RFIInbox />)} />
          <Route path="/my-rfis" element={lazyPage(<MyRFIs />)} />
          <Route path="/meetings" element={lazyPage(<Meetings />)} />
          <Route path="/products" element={lazyPage(<Products />)} />
          <Route path="/business-card" element={lazyPage(<BusinessCard />)} />
          <Route path="/BusinessCard" element={<Navigate to="/business-card" replace />} />
          <Route path="/businesscard" element={<Navigate to="/business-card" replace />} />
          <Route path="/notifications" element={lazyPage(<Notifications />)} />
          <Route path="/catalogue" element={lazyPage(<Catalogue />)} />
          <Route path="/saved-booths" element={lazyPage(<SavedBooths />)} />
          <Route path="/my-library" element={lazyPage(<MyLibrary />)} />
          <Route path="/catalog-library" element={lazyPage(<CatalogLibrary />)} />
          <Route path="/profile" element={lazyPage(<Profile />)} />
          <Route path="/events" element={lazyPage(<EventDirectory />)} />
          <Route path="/discover" element={lazyPage(<ExhibitorDiscover />)} />
          <Route path="/organizer-analytics" element={lazyPage(<OrganizerAnalytics />)} />
          <Route path="/integrations" element={lazyPage(<IntegrationHub />)} />
          <Route path="/workspace/compare" element={lazyPage(<SupplierCompare />)} />
          <Route path="/lead-intelligence" element={lazyPage(<LeadIntelligence />)} />
          <Route path="/analytics" element={lazyPage(<ExhibitorAnalytics />)} />
          <Route path="/premium-booth" element={lazyPage(<PremiumBooth />)} />
          <Route path="/organizer-command" element={lazyPage(<OrganizerCommandCenter />)} />
          <Route path="/nfc" element={lazyPage(<NFCExchange />)} />
          <Route path="/nfc-admin" element={lazyPage(<NFCOrganizerPanel />)} />
          <Route path="/ocr-scanner" element={lazyPage(<OCRScanner />)} />
          <Route path="/contacts" element={lazyPage(<ScannedContacts />)} />
          <Route path="/billing" element={lazyPage(<BillingCenter />)} />
          <Route path="/setup-wizard" element={lazyPage(<ExhibitorSetupWizard />)} />
        </Route>
      </Route>

      {/* Public NFC profile — no auth required */}
      <Route path="/nfc/:userId" element={lazyPage(<NFCProfileView />)} />

      {/* Admin login — public but separate from user login */}
      <Route path="/admin-login" element={lazyPage(<AdminLogin />)} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={lazyPage(<AdminDashboard />)} />
        <Route path="dashboard" element={lazyPage(<AdminDashboard />)} />
        <Route path="users" element={lazyPage(<AdminUsers />)} />
        <Route path="exhibitors" element={lazyPage(<AdminExhibitors />)} />
        <Route path="products" element={lazyPage(<AdminProducts />)} />
        <Route path="catalogues" element={lazyPage(<AdminCatalogues />)} />
        <Route path="events" element={lazyPage(<AdminEvents />)} />
        <Route path="connections" element={lazyPage(<AdminConnections />)} />
        <Route path="revenue" element={lazyPage(<AdminRevenue />)} />
        <Route path="leads" element={lazyPage(<AdminLeads />)} />
        <Route path="media" element={lazyPage(<AdminMedia />)} />
        <Route path="settings" element={lazyPage(<AdminSettings />)} />
        <Route path="data-quality" element={lazyPage(<AdminDataQuality />)} />
        <Route path="audit" element={lazyPage(<AdminAuditLog />)} />
        <Route path="event-readiness" element={lazyPage(<EventReadinessCenter />)} />
        <Route path="control-room" element={lazyPage(<LiveEventControlRoom />)} />
        <Route path="support-center" element={lazyPage(<EventSupportCenter />)} />
        <Route path="tickets" element={lazyPage(<AdminSupportTickets />)} />
        <Route path="nfc-validation" element={lazyPage(<AdminNFCValidation />)} />
        <Route path="search" element={lazyPage(<AdminGlobalSearch />)} />
        <Route path="stress-test" element={lazyPage(<AdminStressTest />)} />
        <Route path="monitoring" element={lazyPage(<AdminMonitoring />)} />
        <Route path="ocr-review" element={lazyPage(<AdminOCRReview />)} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <SentryRouteTracker />
            <SentryUserBridge />
            <AuthenticatedApp />
            <DebugConsoleGate />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;