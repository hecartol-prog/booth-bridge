import React, { useEffect, useMemo, useRef, useState } from "react";
import { auth } from "@/api/authClient";
import { runBusinessCardPipeline, PIPELINE_MODES } from "@/pipeline/businessCardPipeline";
import { uploadCompanyLogo } from "@/utils/assetPipeline";
import { storage } from "@/api/storageClient";
import { db } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase,
  ShoppingBag,
  ArrowRight,
  Upload,
  X,
  ScanLine,
  Sparkles,
  CheckCircle2,
  Loader2,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { APP_LOGO_URL } from "@/config/branding";
import { requiresReview } from "@/pipeline/documentIntelligence/entityValidation";

const LOW_CONFIDENCE_THRESHOLD = 95;

const INDUSTRIES = [
  "Aerospace & Defense",
  "Agriculture & Farming",
  "Automotive",
  "Biotechnology",
  "Chemicals",
  "Construction & Real Estate",
  "Consumer Goods & Retail",
  "Education & Training",
  "Energy & Utilities",
  "Environmental Services",
  "Fashion & Apparel",
  "Finance & Banking",
  "Food & Beverage",
  "Government & Public Sector",
  "Healthcare & Medical",
  "Hospitality & Tourism",
  "Information Technology",
  "Insurance",
  "Legal & Compliance",
  "Logistics & Supply Chain",
  "Machinery & Industrial Equipment",
  "Manufacturing",
  "Marketing & Advertising",
  "Media & Entertainment",
  "Mining & Metals",
  "Non-Profit & NGO",
  "Oil & Gas",
  "Packaging",
  "Pharmaceuticals",
  "Professional Services",
  "Real Estate",
  "Renewable Energy",
  "Research & Development",
  "Semiconductor & Electronics",
  "Software & SaaS",
  "Telecommunications",
  "Textiles",
  "Transportation",
  "Wholesale & Distribution",
  "Other",
];

export default function Onboarding() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [profileMethod, setProfileMethod] = useState(null);
  const [saving, setSaving] = useState(false);

  // Exhibitor fields
  const [companyName, setCompanyName] = useState("");
  const [boothNumber, setBoothNumber] = useState("");
  const [eventName, setEventName] = useState("");
  const [logo, setLogo] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Buyer fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [country, setCountry] = useState("");
  const [productsOfInterest, setProductsOfInterest] = useState("");

  // Card scan state
  const [scanStep, setScanStep] = useState("upload");
  const [cardPreview, setCardPreview] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [fieldConfidenceMap, setFieldConfidenceMap] = useState({});
  const [uncertainFieldKeys, setUncertainFieldKeys] = useState([]);
  const [fieldsConfirmed, setFieldsConfirmed] = useState(false);
  const [finishError, setFinishError] = useState(null);
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const requiresFieldConfirmation = useMemo(
    () => profileMethod === "scan" && uncertainFieldKeys.length > 0,
    [profileMethod, uncertainFieldKeys]
  );

  const fieldBorderClass = (key) => {
    const score = fieldConfidenceMap[key];
    if (score == null || !requiresReview(score)) return "";
    if (score >= 80) return "border-amber-500";
    return "border-red-500";
  };

  useEffect(() => {
    auth.getCurrentUser().then((me) => {
      if (me?.email && !email) setEmail(me.email);
    }).catch(() => {});
  }, [email]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const me = await auth.getCurrentUser();
    const { file_url } = await uploadCompanyLogo(file, me?.id || "onboarding");
    setLogo(file_url);
    setLogoPreviewUrl((await storage.getSignedUrl(file_url)) || file_url);
    setUploadingLogo(false);
  };

  const applyOcrFields = (fields, fc = null) => {
    setFirstName(String(fields.firstName || "").trim());
    setLastName(String(fields.lastName || "").trim());
    setBuyerCompany(String(fields.company || "").trim());
    setEmail(String(fields.email || "").trim());
    setPhone(String(fields.phone || "").trim());
    setMobile(String(fields.mobile || "").trim());
    setJobTitle(String(fields.jobTitle || "").trim());
    setCompanyAddress(String(fields.companyAddress || "").trim());
    setCountry(String(fields.country || "").trim());
    setWebsite(String(fields.website || "").trim());
    setLinkedin(String(fields.linkedin || "").trim());

    const confidenceMap = fc || fields.fieldConfidence || {};
    setFieldConfidenceMap(confidenceMap);

    const confidence = Number.isFinite(fields.confidence) ? fields.confidence : 75;
    setOcrConfidence(confidence);

    const keyMap = {
      firstName: "first_name",
      lastName: "last_name",
      company: "company_name",
      email: "email",
      phone: "phone",
      mobile: "mobile",
      jobTitle: "job_title",
      companyAddress: "address",
      country: "country",
      website: "website",
      linkedin: "linkedin",
    };

    const uncertain = [];
    for (const [uiKey, ocrKey] of Object.entries(keyMap)) {
      const score = confidenceMap[ocrKey] ?? confidenceMap[uiKey];
      if (score == null || requiresReview(score)) uncertain.push(uiKey);
    }
    setUncertainFieldKeys(uncertain);
    setFieldsConfirmed(false);
  };

  const runOcr = async (file) => {
    setFinishError(null);
    setOcrLoading(true);
    setFieldsConfirmed(false);
    setScanStep("scanning");

    const reader = new FileReader();
    reader.onload = (ev) => setCardPreview(ev.target.result);
    reader.readAsDataURL(file);

    try {
      const me = await auth.getCurrentUser();
      if (!me?.id) {
        throw new Error("You must be signed in to scan a business card.");
      }

      const result = await runBusinessCardPipeline({
        file,
        mode: PIPELINE_MODES.OCR_AI,
        scanType: "business_card",
        userId: me.id,
        skipStorage: false,
        target: "onboarding",
      });

      if (!result.success || !result.formFields) {
        const stage = result.error?.stage || "pipeline";
        const code = result.error?.code || "PIPELINE_FAILED";
        throw new Error(
          `[${stage}/${code}] ${result.error?.message || "Could not extract card details. Please enter details manually."}`
        );
      }

      applyOcrFields(result.formFields, result.fieldConfidence);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Card scan failed.";
      setFinishError(`${message} You can fill fields manually.`);
    } finally {
      setOcrLoading(false);
      setScanStep("done");
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await runOcr(file);
    event.target.value = "";
  };

  const chooseManualProfile = () => {
    setProfileMethod("manual");
    setScanStep("done");
    setCardPreview(null);
    setOcrConfidence(null);
    setFieldConfidenceMap({});
    setUncertainFieldKeys([]);
    setFieldsConfirmed(false);
    setFinishError(null);
    setStep(4);
  };

  const chooseScanProfile = () => {
    setProfileMethod("scan");
    setScanStep("upload");
    setCardPreview(null);
    setOcrConfidence(null);
    setFieldConfidenceMap({});
    setUncertainFieldKeys([]);
    setFieldsConfirmed(false);
    setFinishError(null);
    setStep(3);
  };

  const handleFinish = async () => {
    const effectiveRole = role || (step === 4 ? "buyer" : step === 2 && !role ? null : null);
    if (!effectiveRole) {
      setFinishError("Please select a role to continue.");
      return;
    }

    if (effectiveRole === "buyer") {
      if (!firstName.trim() || !lastName.trim() || !buyerCompany.trim()) {
        setFinishError("Please complete first name, last name, and company.");
        return;
      }
      if (requiresFieldConfirmation && !fieldsConfirmed) {
        setFinishError("Please confirm the highlighted OCR fields before saving your profile.");
        return;
      }
    }

    setSaving(true);
    setFinishError(null);
    try {
      const me = await auth.ensureAppUser();

      if (effectiveRole === "exhibitor") {
        let existing = [];
        try { existing = await db.ExhibitorProfile.filter({ user_id: me.id }); } catch { existing = []; }
        let profile;
        if (existing.length > 0) {
          profile = await db.ExhibitorProfile.update(existing[0].id, {
            company_name: companyName,
            booth_number: boothNumber,
            event_name: eventName,
            logo_url: logo || existing[0].logo_url || "",
          });
          profile = { ...existing[0], ...profile };
        } else {
          profile = await db.ExhibitorProfile.create({
            user_id: me.id,
            company_name: companyName,
            booth_number: boothNumber,
            event_name: eventName,
            logo_url: logo || "",
            digital_card: { name: me.full_name, email: me.email, title: "Exhibitor" },
          });
        }
        await auth.updateUserMetadata({ user_role: "exhibitor", onboarded: true, profile_id: profile.id });
      } else {
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        const buyerData = {
          job_title: jobTitle,
          company: buyerCompany,
          industry: industry || "",
          interests: productsOfInterest ? productsOfInterest.split(",").map(s => s.trim()).filter(Boolean) : (industry ? [industry] : []),
          company_address: companyAddress || "",
          country: country || "",
          digital_card: {
            name: fullName || me.full_name,
            email: email || me.email,
            title: jobTitle,
            phone,
            mobile,
            website,
            linkedin: linkedin || "",
          },
        };
        let existing = [];
        try { existing = await db.BuyerProfile.filter({ user_id: me.id }); } catch { existing = []; }
        let profile;
        if (existing.length > 0) {
          profile = await db.BuyerProfile.update(existing[0].id, buyerData);
          profile = { ...existing[0], ...profile };
        } else {
          profile = await db.BuyerProfile.create({ user_id: me.id, ...buyerData });
        }
        await auth.updateUserMetadata({ user_role: "buyer", onboarded: true, profile_id: profile.id });
      }
      window.location.href = "/";
    } catch (err) {
      setFinishError(err?.message || "Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const totalSteps = role === "buyer" ? 4 : 2;
  const currentStep =
    step === 1 ? 1
    : role === "exhibitor" ? (step >= 2 ? 2 : 1)
    : step;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-start sm:justify-center py-8 px-4">
      <div className="absolute top-4 right-4">
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <LanguageSwitcher variant="default" placement="bottom" />
        </div>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={APP_LOGO_URL}
            alt="Booth Bridge"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4"
          />
          <h1 className="text-2xl font-display font-bold">{t("onboarding.welcome")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("onboarding.setupProfile")}</p>
        </div>

        <div className="flex gap-2 mb-6 justify-center">
          {Array.from({ length: totalSteps || 2 }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < currentStep ? "w-12 bg-primary" : "w-8 bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-lg font-heading font-semibold mb-4 text-center">{t("onboarding.iAmAn")}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-md text-center ${role === "exhibitor" ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onClick={() => setRole("exhibitor")}
                >
                  <Briefcase className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-semibold">{t("onboarding.exhibitor")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("onboarding.boothStaff")}</p>
                </Card>
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-md text-center ${role === "buyer" ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onClick={() => setRole("buyer")}
                >
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-semibold">{t("onboarding.buyer")}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t("onboarding.attendee")}</p>
                </Card>
              </div>
              <Button
                className="w-full mt-6"
                disabled={!role}
                onClick={() => setStep(role === "buyer" ? 2 : 2)}
              >
                {t("onboarding.continue")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && role === "buyer" && (
            <motion.div key="step2-method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <div className="text-center mb-2">
                <h2 className="text-lg font-heading font-semibold">Complete your profile</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan your business card or enter your details manually.
                </p>
              </div>
              <Button type="button" className="w-full h-12 font-medium" onClick={chooseScanProfile}>
                <ScanLine className="w-4 h-4 mr-2" />
                Scan Business Card
              </Button>
              <Button type="button" variant="outline" className="w-full h-12" onClick={chooseManualProfile}>
                Complete Manually
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
                {t("onboarding.back")}
              </Button>
            </motion.div>
          )}

          {step === 3 && role === "buyer" && profileMethod === "scan" && (
            <motion.div key="step3-scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-heading font-semibold">{t("onboarding.scanCard")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("onboarding.scanCardSubtitle")}</p>
              </div>

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

              {scanStep === "upload" && (
                <div className="space-y-3">
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
                </div>
              )}

              {scanStep === "scanning" && (
                <div className="flex flex-col items-center gap-4 py-8">
                  {cardPreview && (
                    <img src={cardPreview} alt="Card" className="w-full max-h-40 object-contain rounded-lg border" />
                  )}
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">{t("onboarding.readingCard")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span className="text-xs text-muted-foreground">{t("onboarding.extractingInfo")}</span>
                  </div>
                </div>
              )}

              {scanStep === "done" && (
                <div className="flex flex-col items-center gap-4 py-4">
                  {cardPreview && (
                    <img src={cardPreview} alt="Card" className="w-full max-h-36 object-contain rounded-lg border" />
                  )}
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {cardPreview ? t("onboarding.cardScanned") : t("onboarding.readyFill")}
                    </span>
                  </div>
                  {ocrConfidence !== null && (
                    <p className={`text-xs ${ocrConfidence < LOW_CONFIDENCE_THRESHOLD ? "text-amber-600" : "text-green-600"}`}>
                      OCR confidence: {ocrConfidence}%
                    </p>
                  )}
                </div>
              )}

              {finishError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{finishError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">{t("onboarding.back")}</Button>
                {scanStep !== "scanning" && (
                  <Button onClick={() => setStep(4)} className="flex-1">
                    {t("onboarding.continue")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && role === "buyer" && (
            <motion.div key="step4-buyer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <h2 className="text-lg font-heading font-semibold text-center">{t("onboarding.yourProfile")}</h2>
              {profileMethod === "scan" && cardPreview && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("onboarding.autoFilled")}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name *</Label>
                  <Input
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className={fieldBorderClass("firstName")}
                    required
                  />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className={fieldBorderClass("lastName")}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.jobTitle")}</Label>
                  <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className={fieldBorderClass("jobTitle")} placeholder="Procurement Manager" />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.company")} *</Label>
                  <Input
                    value={buyerCompany}
                    onChange={e => setBuyerCompany(e.target.value)}
                    className={fieldBorderClass("company")}
                    placeholder="Acme Corp"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.industry")}</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("onboarding.selectIndustry")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {INDUSTRIES.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Office Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className={fieldBorderClass("phone")} placeholder="+1 555 0000" />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input value={mobile} onChange={e => setMobile(e.target.value)} className={fieldBorderClass("mobile")} placeholder="+1 555 0001" />
                </div>
                <div className="col-span-2">
                  <Label>{t("auth.email")}</Label>
                  <Input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={fieldBorderClass("email")}
                    placeholder="you@company.com"
                    type="email"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Company Address</Label>
                  <Input value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} className={fieldBorderClass("companyAddress")} placeholder="123 Main St, New York, NY" />
                </div>
                <div className="col-span-2">
                  <Label>Country</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} className={fieldBorderClass("country")} placeholder="United States" />
                </div>
                <div className="col-span-2">
                  <Label>Products / Interests</Label>
                  <Input value={productsOfInterest} onChange={e => setProductsOfInterest(e.target.value)} placeholder="e.g. Solar panels, EV batteries, LED lighting" />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.website")}</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} className={fieldBorderClass("website")} placeholder="https://company.com" />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.linkedin")}</Label>
                  <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} className={fieldBorderClass("linkedin")} placeholder="linkedin.com/in/yourname" />
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
                    I reviewed and corrected highlighted fields (below 95% confidence) before saving my profile.
                  </span>
                </label>
              )}

              {finishError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{finishError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(profileMethod === "scan" ? 3 : 2)}
                  className="flex-1"
                >
                  {t("onboarding.back")}
                </Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("onboarding.settingUp")}</> : t("onboarding.finishSetup")}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && role === "exhibitor" && (
            <motion.div key="step2-exhibitor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-lg font-heading font-semibold text-center">{t("onboarding.setupBooth")}</h2>
              <div>
                <Label>{t("onboarding.companyName")} *</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <Label>{t("onboarding.boothNumber")} *</Label>
                <Input value={boothNumber} onChange={e => setBoothNumber(e.target.value)} placeholder="A-42" />
              </div>
              <div>
                <Label>{t("onboarding.eventName")} *</Label>
                <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="CES 2026" />
              </div>
              <div>
                <Label>{t("onboarding.companyLogo")}</Label>
                {logo ? (
                  <div className="relative w-20 h-20 mt-2">
                    <img src={logoPreviewUrl || logo} className="w-20 h-20 rounded-lg object-cover" alt="Logo" />
                    <button onClick={() => { setLogo(null); setLogoPreviewUrl(null); }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 mt-2 px-4 py-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">{uploadingLogo ? t("onboarding.uploading") : t("onboarding.uploadLogo")}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                )}
              </div>
              {finishError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{finishError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t("onboarding.back")}</Button>
                <Button onClick={handleFinish} disabled={!companyName || !boothNumber || !eventName || saving} className="flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("onboarding.settingUp")}</> : t("onboarding.finishSetup")}
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
