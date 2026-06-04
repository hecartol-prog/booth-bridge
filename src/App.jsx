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
        </Route>
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