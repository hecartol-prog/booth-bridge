import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "@/api/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Eye, EyeOff, ScanLine, Upload, Camera } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { extractOcrScan } from "@/api/aiClient";
import { sanitizeOCRResult } from "@/utils/securitySanitizer";
import { readCompressedImageAsDataUrl } from "@/utils/imageCompression";
import { isPasswordAcceptable } from "@/utils/passwordStrength";
import PasswordStrengthFeedback from "@/components/PasswordStrengthFeedback";

const LOW_CONFIDENCE_THRESHOLD = 70;

export default function Register() {
  const [mode, setMode] = useState(null);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [uncertainFieldKeys, setUncertainFieldKeys] = useState([]);
  const [fieldsConfirmed, setFieldsConfirmed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const requiresFieldConfirmation = useMemo(
    () => mode === "scan" && (ocrConfidence || 0) < LOW_CONFIDENCE_THRESHOLD,
    [mode, ocrConfidence]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !company.trim()) {
      setError("Please complete all required fields.");
      return;
    }

    if (!isPasswordAcceptable(password)) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (requiresFieldConfirmation && !fieldsConfirmed) {
      setError("Please confirm the highlighted OCR fields before creating your account.");
      return;
    }

    setLoading(true);
    try {
      await auth.register({
        email: email.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        company: company.trim(),
        jobTitle: jobTitle.trim(),
        phone: phone.trim(),
        country: country.trim(),
      });
      setVerificationMessage(
        `We've sent a verification email to ${email.trim()}. Please verify your email before signing in.`
      );
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const runOcr = async (file) => {
    setError("");
    setOcrLoading(true);
    setFieldsConfirmed(false);
    try {
      // Pre-auth registration: send image directly to OCR (no storage upload — RLS requires auth.uid()).
      const imageUrl = await readCompressedImageAsDataUrl(file);
      const response = await extractOcrScan({
        scanType: "business_card",
        imageUrl,
      });

      if (!response?.success || !response?.result) {
        throw new Error("Could not extract card details. Please enter details manually.");
      }

      const sanitized = sanitizeOCRResult(response.result);
      setFirstName(String(sanitized.first_name || "").trim());
      setLastName(String(sanitized.last_name || "").trim());
      setCompany(String(sanitized.company || "").trim());
      setEmail(String(sanitized.email || "").trim());
      setPhone(String(sanitized.phone || "").trim());
      setJobTitle(String(sanitized.position || "").trim());
      setCountry(String(sanitized.country || "").trim());

      const confidence = Number.isFinite(sanitized.confidence) ? sanitized.confidence : 75;
      setOcrConfidence(confidence);

      const uncertain = [];
      if (confidence < LOW_CONFIDENCE_THRESHOLD) {
        uncertain.push("firstName", "lastName", "company", "email");
      }
      setUncertainFieldKeys(uncertain);
    } catch (err) {
      setError(err?.message || "Card scan failed. You can continue with manual registration.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await runOcr(file);
    event.target.value = "";
  };

  if (verificationMessage) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={verificationMessage}
        footer={
          <>
            Already verified?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          Your account has been created. You must verify your email to complete sign-in.
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          If you do not receive the email in a few minutes, check spam or try registering again.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Fast signup for live events"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {!mode && (
        <div className="space-y-3 mb-6">
          <Button
            type="button"
            className="w-full h-12 font-medium"
            onClick={() => setMode("scan")}
          >
            <ScanLine className="w-4 h-4 mr-2" />
            Scan Business Card
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={() => setMode("manual")}
          >
            Register Manually
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {mode === "scan" && (
        <div className="space-y-3 mb-5">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={ocrLoading}
            onClick={() => cameraInputRef.current?.click()}
          >
            {ocrLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
            Capture Card Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={ocrLoading}
            onClick={() => uploadInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Card Image
          </Button>
          {ocrConfidence !== null && (
            <p className={`text-xs ${ocrConfidence < LOW_CONFIDENCE_THRESHOLD ? "text-amber-600" : "text-green-600"}`}>
              OCR confidence: {ocrConfidence}%
            </p>
          )}
        </div>
      )}

      {mode && (
        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={uncertainFieldKeys.includes("firstName") ? "border-amber-500" : ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={uncertainFieldKeys.includes("lastName") ? "border-amber-500" : ""}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
              className={`pl-10 h-12 ${uncertainFieldKeys.includes("email") ? "border-amber-500" : ""}`}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={uncertainFieldKeys.includes("company") ? "border-amber-500" : ""}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title (optional)</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country (optional)</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrengthFeedback password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {requiresFieldConfirmation && (
          <label className="flex items-start gap-2 text-sm rounded-md border border-amber-300 bg-amber-50 p-3">
            <input
              type="checkbox"
              checked={fieldsConfirmed}
              onChange={(e) => setFieldsConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              OCR confidence is low. I reviewed and corrected highlighted fields before creating my account.
            </span>
          </label>
        )}
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setMode(null);
            setError("");
          }}
        >
          Back
        </Button>
        </form>
      )}
    </AuthLayout>
  );
}