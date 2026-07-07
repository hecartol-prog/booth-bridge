import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { auth } from "@/api/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useI18n } from "@/lib/i18n";

export default function Login() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Easter egg: 5 logo taps reveals admin link
  const logoTapsRef = useRef(0);
  const logoTapTimerRef = useRef(null);
  const [showAdminLink, setShowAdminLink] = useState(false);

  const handleLogoTap = () => {
    logoTapsRef.current += 1;
    clearTimeout(logoTapTimerRef.current);
    logoTapTimerRef.current = setTimeout(() => { logoTapsRef.current = 0; }, 3000);
    if (logoTapsRef.current >= 5) {
      setShowAdminLink(true);
      logoTapsRef.current = 0;
    }
  };

  const mapLoginError = (err) => {
    const msg = (err?.message || "").toLowerCase();
    if (!navigator.onLine) return "No internet connection. Check your network and try again.";
    if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
      return "Your email is not verified yet. Please verify your email before signing in.";
    }
    if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
      return "Wrong email or password. Please try again.";
    }
    if (msg.includes("invalid") && msg.includes("password")) {
      return "Wrong password. Please try again.";
    }
    if (msg.includes("user not found") || msg.includes("no user")) {
      return "No account found with this email. Please create an account.";
    }
    if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("timeout")) {
      return "Network error. Please try again in a moment.";
    }
    if (msg.includes("service unavailable") || msg.includes("500") || msg.includes("503")) {
      return "Service is temporarily unavailable. Please try again shortly.";
    }
    return "Unable to sign in right now. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await auth.loginWithEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(mapLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title={t("auth.welcomeBack")}
      subtitle={t("auth.loginSubtitle")}
      onLogoClick={handleLogoTap}
      adminLinkVisible={showAdminLink}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            {t("auth.createOne")}
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm whitespace-pre-wrap" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              {t("auth.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("auth.loggingIn")}
            </>
          ) : t("auth.login")}
        </Button>
      </form>
    </AuthLayout>
  );
}