import React, { useState, useEffect } from "react";
import { auth } from "@/api/authClient";
import { db } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";

const LOGO = "https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png";

const ADMIN_ROLES = ["admin", "superadmin", "systemadmin", "supportadmin"];

// Track failed attempts in session storage so they reset on page reload
const getAttempts = () => parseInt(sessionStorage.getItem("bb_admin_attempts") || "0");
const setAttempts = (n) => sessionStorage.setItem("bb_admin_attempts", String(n));
const getLockout = () => parseInt(sessionStorage.getItem("bb_admin_lockout") || "0");
const setLockout = (ts) => sessionStorage.setItem("bb_admin_lockout", String(ts));
const clearAttempts = () => { sessionStorage.removeItem("bb_admin_attempts"); sessionStorage.removeItem("bb_admin_lockout"); };

function logAdminAccess(data) {
  const nav = navigator;
  const entry = {
    email: data.email || "",
    action_performed: data.action,
    status: data.status,
    browser: nav.userAgent?.split(" ").slice(-2).join(" ") || "unknown",
    device: /Mobi/.test(nav.userAgent) ? "mobile" : "desktop",
    login_timestamp: new Date().toISOString(),
    notes: data.notes || "",
  };
  // Fire and forget — don't block login flow
  db.AdminAccessLog.create(entry).catch(() => {});
}

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // MFA architecture hook — placeholder for future implementation
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    // Clear any stale lockout state on mount
    const lu = getLockout();
    if (lu && Date.now() < lu) {
      setIsLockedOut(true);
      setLockoutSeconds(Math.ceil((lu - Date.now()) / 1000));
    } else {
      clearAttempts();
    }
  }, []);

  useEffect(() => {
    if (!isLockedOut) return;
    const timer = setInterval(() => {
      const remaining = Math.ceil((getLockout() - Date.now()) / 1000);
      if (remaining <= 0) {
        setIsLockedOut(false);
        setLockoutSeconds(0);
        clearAttempts();
      } else {
        setLockoutSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isLockedOut]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isLockedOut) {
      setError(`Too many failed attempts. Try again in ${lockoutSeconds}s.`);
      return;
    }

    setLoading(true);
    try {
      const res = await auth.adminLogin(email.trim(), password);

      if (!res.data?.success) {
        throw new Error("Invalid credentials.");
      }

      // Success
      clearAttempts();
      logAdminAccess({ email, action: "login", status: "success" });
      window.location.href = "/admin";
    } catch (err) {
      const attempts = getAttempts() + 1;
      setAttempts(attempts);

      if (attempts >= 5) {
        const lockTs = Date.now() + 5 * 60 * 1000;
        setLockout(lockTs);
        setIsLockedOut(true);
        setLockoutSeconds(300);
        logAdminAccess({ email, action: "failed_login", status: "failed", notes: "Locked out after 5 attempts" });
        setError("Too many failed attempts. Access locked for 5 minutes.");
      } else {
        logAdminAccess({ email, action: "failed_login", status: "failed" });
        setError(`Invalid email or password. ${5 - attempts} attempt(s) remaining.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">BoothBridge Administration</h1>
          <p className="text-slate-400 text-sm mt-1">Secure access for authorized personnel only</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* MFA placeholder — future implementation */}
          {mfaRequired ? (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm text-center">
                Multi-Factor Authentication required.
              </p>
              <div className="space-y-2">
                <Label htmlFor="mfa" className="text-slate-300">Verification Code</Label>
                <Input
                  id="mfa"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 h-12 text-center text-xl tracking-widest"
                  maxLength={6}
                />
              </div>
              <p className="text-slate-500 text-xs text-center">
                MFA not yet activated — architecture ready for Email OTP, Google Authenticator, Microsoft Authenticator &amp; SMS.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="admin@boothbridge.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    required
                    disabled={isLockedOut}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                    required
                    disabled={isLockedOut}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={loading || isLockedOut}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                ) : isLockedOut ? (
                  `Locked — ${lockoutSeconds}s`
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" /> Secure Sign In</>
                )}
              </Button>
            </form>
          )}

          {/* Future SSO placeholder */}
          <div className="mt-6 pt-5 border-t border-slate-700">
            <p className="text-slate-600 text-xs text-center">
              SSO / MFA architecture ready · Not yet activated
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Unauthorized access is prohibited and monitored.
        </p>
      </div>
    </div>
  );
}