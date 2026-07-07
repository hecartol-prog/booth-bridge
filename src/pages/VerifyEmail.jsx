import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MailCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { auth } from "@/api/authClient";

function mailboxLink(email) {
  const domain = (email.split("@")[1] || "").toLowerCase();
  if (domain.includes("gmail")) return "https://mail.google.com";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live")) {
    return "https://outlook.live.com/mail";
  }
  return "mailto:";
}

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const openEmailUrl = useMemo(() => mailboxLink(email), [email]);

  useEffect(() => {
    let mounted = true;
    const timer = setInterval(async () => {
      try {
        const session = await auth.currentSession();
        if (!mounted) return;
        if (session?.user?.email_confirmed_at) {
          window.location.href = "/";
        }
      } catch {
        // silent polling
      }
    }, 4000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleResend = async () => {
    if (!email) return;
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await auth.resendOtp(email);
      setMessage("Verification email sent. Please check your inbox.");
    } catch {
      setError("We couldn't resend the verification email right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkVerification = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const session = await auth.currentSession();
      if (session?.user?.email_confirmed_at) {
        window.location.href = "/";
        return;
      }
      setMessage("Email is not verified yet. Open your inbox and click the verification link.");
    } catch {
      setError("Unable to confirm verification right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={MailCheck}
      title="Almost done!"
      subtitle="Verify your email to activate your BoothBridge account."
    >
      <div className="space-y-4">
        <p className="text-sm text-center text-muted-foreground">
          We've sent a verification email to
        </p>
        <p className="text-center font-semibold break-all">{email || "your email address"}</p>

        {message && <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm" role="status">{message}</div>}
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert">{error}</div>}

        <div className="space-y-2">
          <Button asChild className="w-full h-12 font-medium">
            <a href={openEmailUrl} target="_blank" rel="noreferrer">Open Email</a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={handleResend}
            disabled={loading || !email}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Resend
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={checkVerification}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            I've Verified - Continue
          </Button>
        </div>

        <div className="text-center text-sm">
          <Link to="/register" className="text-primary font-medium hover:underline">Change Email</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
