import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/api/authClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useI18n } from "@/lib/i18n";

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { applyUser } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await auth.loginWithEmailPassword(email, password);
      applyUser(loggedInUser);
      navigate("/", { replace: true });
    } catch (err) {
      // Map common error codes to user-friendly messages
      const msg = err?.message || "";
      if (!navigator.onLine) {
        setError(t("auth.errors.offline"));
      } else if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("password")) {
        setError(t("auth.errors.invalidCredentials"));
      } else if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("no user")) {
        setError(t("auth.errors.noAccount"));
      } else if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("network")) {
        setError(t("auth.errors.networkTimeout"));
      } else if (msg.toLowerCase().includes("too many") || msg.toLowerCase().includes("rate limit")) {
        setError(t("auth.errors.rateLimited"));
      } else {
        setError(msg || t("auth.errors.generic"));
      }
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
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
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
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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