import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ProtectedRoute from "@/components/ProtectedRoute";

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// App pages
import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import QRCodePage from "@/pages/QRCode";
import ScanQR from "@/pages/ScanQR";
import Connections from "@/pages/Connections";
import RFIInbox from "@/pages/RFIInbox";
import MyRFIs from "@/pages/MyRFIs";
import Meetings from "@/pages/Meetings";
import Products from "@/pages/Products";
import BusinessCard from "@/pages/BusinessCard";
import Notifications from "@/pages/Notifications";
import Catalogue from "@/pages/Catalogue";
import Profile from "@/pages/Profile";
import AppLayout from "@/components/layout/AppLayout";
import SavedBooths from "@/pages/SavedBooths";
import MyLibrary from "@/pages/MyLibrary";
import CatalogLibrary from "@/pages/CatalogLibrary";
import DigitalBooth from "@/pages/DigitalBooth";
import EventDirectory from "@/pages/EventDirectory";
import ExhibitorDiscover from "@/pages/ExhibitorDiscover";
import OrganizerAnalytics from "@/pages/OrganizerAnalytics";
import SupplierCompare from "@/pages/SupplierCompare";
import IntegrationHub from "@/pages/IntegrationHub";
import LeadIntelligence from "@/pages/LeadIntelligence";
import ExhibitorAnalytics from "@/pages/ExhibitorAnalytics";
import PremiumBooth from "@/pages/PremiumBooth";
import OrganizerCommandCenter from "@/pages/OrganizerCommandCenter";
import NFCExchange from "@/pages/NFCExchange";
import NFCProfileView from "@/pages/NFCProfileView";
import NFCOrganizerPanel from "@/pages/NFCOrganizerPanel";
import OCRScanner from "@/pages/OCRScanner";
import ScannedContacts from "@/pages/ScannedContacts";
import BillingCenter from "@/pages/BillingCenter";

// Admin pages
import AdminLayout from "@/components/layout/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminExhibitors from "@/pages/admin/AdminExhibitors";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminCatalogues from "@/pages/admin/AdminCatalogues";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminConnections from "@/pages/admin/AdminConnections";
import AdminRevenue from "@/pages/admin/AdminRevenue";

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
          element={<Onboarding />}
        />

        {/* Main app with layout */}
        <Route element={<OnboardedGuard><AppLayout /></OnboardedGuard>}>
          <Route path="/" element={<Home />} />
          <Route path="/qr" element={<QRCodePage />} />
          <Route path="/scan" element={<ScanQR />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/rfi-inbox" element={<RFIInbox />} />
          <Route path="/my-rfis" element={<MyRFIs />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/products" element={<Products />} />
          <Route path="/business-card" element={<BusinessCard />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/catalogue" element={<Catalogue />} />
          <Route path="/saved-booths" element={<SavedBooths />} />
          <Route path="/my-library" element={<MyLibrary />} />
          <Route path="/catalog-library" element={<CatalogLibrary />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/events" element={<EventDirectory />} />
          <Route path="/discover" element={<ExhibitorDiscover />} />
          <Route path="/organizer-analytics" element={<OrganizerAnalytics />} />
          <Route path="/integrations" element={<IntegrationHub />} />
          <Route path="/workspace/compare" element={<SupplierCompare />} />
          <Route path="/lead-intelligence" element={<LeadIntelligence />} />
          <Route path="/analytics" element={<ExhibitorAnalytics />} />
          <Route path="/premium-booth" element={<PremiumBooth />} />
          <Route path="/organizer-command" element={<OrganizerCommandCenter />} />
          <Route path="/nfc" element={<NFCExchange />} />
          <Route path="/nfc-admin" element={<NFCOrganizerPanel />} />
          <Route path="/ocr-scanner" element={<OCRScanner />} />
          <Route path="/contacts" element={<ScannedContacts />} />
          <Route path="/billing" element={<BillingCenter />} />
        </Route>
      </Route>

      {/* Public NFC profile — no auth required */}
      <Route path="/nfc/:userId" element={<NFCProfileView />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="exhibitors" element={<AdminExhibitors />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="catalogues" element={<AdminCatalogues />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="connections" element={<AdminConnections />} />
        <Route path="revenue" element={<AdminRevenue />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function OnboardedGuard({ children }) {
  const { user } = useAuth();
  
  if (user && (!user.onboarded || !user.user_role)) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return children;
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;