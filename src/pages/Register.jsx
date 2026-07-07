import React, { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/api/authClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UserPlus,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Camera,
  Upload,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { extractOcrScan } from "@/api/aiClient";
import { uploadOcrScan } from "@/utils/assetPipeline";
import { storage } from "@/api/storageClient";
import { sanitizeOCRResult, validateFieldPattern } from "@/utils/securitySanitizer";

function normalizeCompanyName(name) {
  const collapsed = String(name || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!collapsed) return "";
  return collapsed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function passwordChecks(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function Register() {
  const navigate = useNavigate();
  const [entryMode, setEntryMode] = useState("choose");
  const captureRef = useRef(null);
  const uploadRef = useRef(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [ocrComplete, setOcrComplete] = useState(false);
  const [ocrConfirmChecked, setOcrConfirmChecked] = useState(false);
  const [processingScan, setProcessingScan] = useState(false);
  const [uncertainFields, setUncertainFields] = useState([]);
  const [ocrStage, setOcrStage] = useState("scan");
  const [retryAvailable, setRetryAvailable] = useState(false);

  const isOcrFlow = entryMode === "scan";
  const confidenceLevel =
    typeof ocrConfidence !== "number" ? "unknown" : ocrConfidence >= 80 ? "high" : ocrConfidence >= 60 ? "medium" : "low";
  const checks = useMemo(() => passwordChecks(password), [password]);
  const passwordStrong = Object.values(checks).every(Boolean);
  const requiredFieldsComplete = !!firstName.trim() && !!lastName.trim() && !!email.trim() && !!company.trim();
  const emailValidation = validateFieldPattern(email, "email");
  const phoneValidation = validateFieldPattern(phone, "phone");
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit =
    !loading &&
    !processingScan &&
    requiredFieldsComplete &&
    emailValidation.valid &&
    phoneValidation.valid &&
    passwordStrong &&
    passwordsMatch &&
    (!isOcrFlow || (ocrComplete && ocrStage === "account" && ocrConfirmChecked));

  const setFromExtractedData = (data) => {
    const fullName = (data.full_name || "").trim();
    const guessedFirstName = fullName && !data.first_name ? fullName.split(" ")[0] : "";
    const guessedLastName =
      fullName && !data.last_name ? fullName.split(" ").slice(1).join(" ") : "";

    const nextFirstName = (data.first_name || guessedFirstName || "").trim();
    const nextLastName = (data.last_name || guessedLastName || "").trim();
    const nextEmail = (data.email || "").trim();
    const nextCompany = (data.company || "").trim();
    const nextJobTitle = (data.position || "").trim();
    const nextPhone = (data.phone || data.mobile || "").trim();
    const nextCountry = (data.country || "").trim();

    setFirstName(nextFirstName);
    setLastName(nextLastName);
    setEmail(nextEmail);
    setCompany(normalizeCompanyName(nextCompany));
    setJobTitle(nextJobTitle);
    setPhone(nextPhone);
    setCountry(nextCountry);
  };

  const processBusinessCard = async (file) => {
    setError("");
    setSuccessMessage("");
    setRetryAvailable(false);
    setOcrStage("extracting");
    setProcessingScan(true);
    try {
      const { file_url } = await uploadOcrScan(file, "registration");
      const extractionUrl = (await storage.getSignedUrl(file_url)) || file_url;
      const response = await extractOcrScan({ scanType: "business_card", imageUrl: extractionUrl });
      if (!response.success) throw new Error(response.error?.message || "OCR extraction failed");

      const sanitized = sanitizeOCRResult(response.result || {});
      const confidence = Number.isFinite(sanitized.confidence) ? sanitized.confidence : 60;
      setOcrConfidence(confidence);
      setFromExtractedData(sanitized);
      setOcrComplete(true);
      setOcrConfirmChecked(false);
      setOcrStage("review");

      const uncertain = [];
      if (!sanitized.first_name && !sanitized.full_name) uncertain.push("firstName");
      if (!sanitized.last_name && !sanitized.full_name) uncertain.push("lastName");
      if (!sanitized.email) uncertain.push("email");
      if (!sanitized.company) uncertain.push("company");
      if (confidence < 70) {
        uncertain.push("firstName", "lastName", "email", "company", "jobTitle", "phone");
      }
      setUncertainFields(Array.from(new Set(uncertain)));
    } catch (err) {
      setRetryAvailable(true);
      setOcrStage("scan");
      setError("Could not process your business card. Please retry or continue with manual registration.");
    } finally {
      setProcessingScan(false);
    }
  };

  const onScanSelected = (event) => {
    const file = event.target.files?.[0];
    if (file) processBusinessCard(file);
    event.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSuccessMessage("");
    setLoading(true);
    try {
      await auth.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        company: normalizeCompanyName(company),
        job_title: jobTitle.trim(),
        phone: phone.trim(),
        country: country.trim(),
        password,
        registration_source: isOcrFlow ? "business_card_ocr" : "manual",
      });
      setSuccessMessage("Account created. Sending verification instructions...");
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      setError("We couldn't create your account right now. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle={entryMode === "choose" ? "Choose how to register" : "Fast signup for trade-show users"}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      {entryMode === "choose" ? (
        <div className="space-y-3">
          <Button className="w-full h-14 text-base font-semibold" onClick={() => setEntryMode("scan")}>
            <ScanLine className="w-5 h-5 mr-2" />
            Scan Business Card
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => setEntryMode("manual")}>
            Register Manually
          </Button>
        </div>
      ) : (
        <>
          {isOcrFlow && (
            <div className="mb-5 rounded-lg border border-border p-3 space-y-2">
              <div className="text-sm font-medium">Business Card Registration</div>
              <div className="grid grid-cols-4 gap-1" aria-label="OCR registration progress">
                {["Scan", "Extracting", "Review", "Create"].map((item, index) => {
                  const stageIdx = { scan: 0, extracting: 1, review: 2, account: 3 }[ocrStage] ?? 0;
                  const active = index <= stageIdx;
                  return <div key={item} className={`h-1 rounded ${active ? "bg-primary" : "bg-muted"}`} />;
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {ocrStage === "scan" && "Step 1 of 4: Scan card"}
                {ocrStage === "extracting" && "Step 2 of 4: Extracting information..."}
                {ocrStage === "review" && "Step 3 of 4: Review extracted information"}
                {ocrStage === "account" && "Step 4 of 4: Create account"}
              </p>
              <input
                ref={captureRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onScanSelected}
              />
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onScanSelected}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => captureRef.current?.click()}
                  disabled={processingScan}
                  aria-label="Scan business card with camera"
                >
                  {processingScan ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                  Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => uploadRef.current?.click()}
                  disabled={processingScan}
                  aria-label="Upload business card image"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
              {processingScan && (
                <div className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading business card and extracting information...
                </div>
              )}
              {retryAvailable && (
                <Button type="button" variant="ghost" className="w-full" onClick={() => setOcrStage("scan")}>
                  Retry scan
                </Button>
              )}
              {ocrComplete && (
                <div
                  className={`text-xs rounded-md p-2 flex items-center gap-2 ${
                    confidenceLevel === "high"
                      ? "bg-green-100 text-green-800"
                      : confidenceLevel === "medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {confidenceLevel === "low" ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5 animate-bounce" />}
                  {confidenceLevel === "high" && "High confidence extraction."}
                  {confidenceLevel === "medium" && "Medium confidence extraction."}
                  {confidenceLevel === "low" && "Low confidence extraction. Please verify highlighted fields."}
                  {" "}({ocrConfidence}%)
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="alert" aria-live="polite">
              <p>{error}</p>
              {isOcrFlow && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 px-0 h-auto text-destructive underline"
                  onClick={() => setEntryMode("manual")}
                >
                  Continue with manual registration
                </Button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800 text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={uncertainFields.includes("firstName") ? "border-amber-500" : ""}
                  aria-invalid={!firstName.trim()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={uncertainFields.includes("lastName") ? "border-amber-500" : ""}
                  aria-invalid={!lastName.trim()}
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
                  className={`pl-10 h-12 ${uncertainFields.includes("email") ? "border-amber-500" : ""}`}
                  aria-invalid={!emailValidation.valid}
                  required
                />
              </div>
              {email && (
                <p className={`text-xs ${emailValidation.valid ? "text-green-700" : "text-red-700"}`}>
                  {emailValidation.valid ? "Valid email" : emailValidation.reason}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={uncertainFields.includes("company") ? "border-amber-500" : ""}
                aria-invalid={!company.trim()}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="jobTitle">Job Title (Optional)</Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className={uncertainFields.includes("jobTitle") ? "border-amber-500" : ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={uncertainFields.includes("phone") ? "border-amber-500" : ""}
                  aria-invalid={!phoneValidation.valid}
                />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="country">Country (Optional)</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
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
                  aria-invalid={!passwordStrong && password.length > 0}
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
              <div className="space-y-1 text-xs">
                <div className="h-1.5 rounded bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passwordStrong ? "bg-green-600" : Object.values(checks).filter(Boolean).length >= 3 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%` }}
                  />
                </div>
                <p className="text-muted-foreground">Password strength requirements:</p>
                <p className={checks.length ? "text-green-700" : "text-muted-foreground"}>✓ 8+ characters</p>
                <p className={checks.uppercase ? "text-green-700" : "text-muted-foreground"}>✓ Uppercase</p>
                <p className={checks.lowercase ? "text-green-700" : "text-muted-foreground"}>✓ Lowercase</p>
                <p className={checks.number ? "text-green-700" : "text-muted-foreground"}>✓ Number</p>
                <p className={checks.special ? "text-green-700" : "text-muted-foreground"}>✓ Special character</p>
              </div>
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
                  aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`text-xs ${passwordsMatch ? "text-green-700" : "text-red-700"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>

            {isOcrFlow && ocrComplete && ocrStage === "review" && (
              <Button
                type="button"
                className="w-full"
                variant="outline"
                onClick={() => setOcrStage("account")}
              >
                Continue
              </Button>
            )}

            {isOcrFlow && ocrComplete && ocrStage === "account" && (
              <label className="flex gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={ocrConfirmChecked}
                  onChange={(e) => setOcrConfirmChecked(e.target.checked)}
                />
                I confirm the scanned details are correct.
              </label>
            )}

            <Button type="submit" className="w-full h-12 font-medium" disabled={!canSubmit}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <Button type="button" variant="ghost" className="w-full" onClick={() => setEntryMode("choose")}>
              Back
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}