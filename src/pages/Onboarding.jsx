import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, ShoppingBag, ArrowRight, Upload, X, ScanLine, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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

const CARD_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    title: { type: "string" },
    company: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    website: { type: "string" },
    linkedin: { type: "string" },
    industry: { type: "string" },
  },
};

export default function Onboarding() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [saving, setSaving] = useState(false);

  // Exhibitor fields
  const [companyName, setCompanyName] = useState("");
  const [boothNumber, setBoothNumber] = useState("");
  const [eventName, setEventName] = useState("");
  const [logo, setLogo] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Buyer fields
  const [jobTitle, setJobTitle] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // Card scan state
  const [scanStep, setScanStep] = useState("upload"); // "upload" | "scanning" | "done"
  const [cardPreview, setCardPreview] = useState(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogo(file_url);
    setUploadingLogo(false);
  };

  const handleCardScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setCardPreview(ev.target.result);
    reader.readAsDataURL(file);

    setScanStep("scanning");

    try {
      // Upload then extract
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: CARD_SCHEMA,
      });

      if (result.status === "success" && result.output) {
        const data = Array.isArray(result.output) ? result.output[0] : result.output;
        if (data.title) setJobTitle(data.title);
        if (data.company) setBuyerCompany(data.company);
        if (data.email) setEmail(data.email);
        if (data.phone) setPhone(data.phone);
        if (data.website) setWebsite(data.website);
        if (data.linkedin) setLinkedin(data.linkedin);
        // Try to match industry
        if (data.industry) {
          const match = INDUSTRIES.find(ind =>
            ind.toLowerCase().includes(data.industry.toLowerCase()) ||
            data.industry.toLowerCase().includes(ind.toLowerCase().split(" ")[0])
          );
          if (match) setIndustry(match);
        }
      }
    } catch (err) {
      // Scan failed — still allow user to continue manually
    } finally {
      setScanStep("done");
    }
  };

  const skipScan = () => {
    setScanStep("done");
  };

  const handleFinish = async () => {
    setSaving(true);
    const me = await base44.auth.me();

    if (role === "exhibitor") {
      const profile = await base44.entities.ExhibitorProfile.create({
        user_id: me.id,
        company_name: companyName,
        booth_number: boothNumber,
        event_name: eventName,
        logo_url: logo || "",
        digital_card: { name: me.full_name, email: me.email, title: "Exhibitor" },
      });
      await base44.auth.updateMe({ role: "exhibitor", onboarded: true, profile_id: profile.id });
    } else {
      const profile = await base44.entities.BuyerProfile.create({
        user_id: me.id,
        job_title: jobTitle,
        company: buyerCompany,
        industry,
        interests: industry ? [industry] : [],
        digital_card: {
          name: me.full_name,
          email: email || me.email,
          title: jobTitle,
          phone,
          website,
          linkedin,
        },
      });
      await base44.auth.updateMe({ role: "buyer", onboarded: true, profile_id: profile.id });
    }
    window.location.href = "/";
  };

  // Total steps: 1 (role) + 2 (buyer: scan + form) or 2 (exhibitor: booth form)
  const totalSteps = role === "buyer" ? 3 : 2;
  const currentStep = step === 1 ? 1 : role === "buyer" ? step : 2;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-start sm:justify-center py-8 px-4">
      <div className="absolute top-4 right-4">
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <LanguageSwitcher />
        </div>
      </div>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png"
            alt="Booth Bridge"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4"
          />
          <h1 className="text-2xl font-display font-bold">{t("onboarding.welcome")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("onboarding.setupProfile")}</p>
        </div>

        {/* Progress dots */}
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

          {/* ── STEP 1: Choose role ── */}
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
              <Button className="w-full mt-6" disabled={!role} onClick={() => setStep(2)}>
                {t("onboarding.continue")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* ── STEP 2 (buyer): Scan business card ── */}
          {step === 2 && role === "buyer" && (
            <motion.div key="step2-scan" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-heading font-semibold">{t("onboarding.scanCard")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("onboarding.scanCardSubtitle")}</p>
              </div>

              {scanStep === "upload" && (
                <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ScanLine className="w-7 h-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{t("onboarding.uploadCard")}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t("onboarding.cardFormats")}</p>
                  </div>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleCardScan} />
                </label>
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
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t("onboarding.back")}</Button>
                {scanStep === "upload" && (
                  <Button variant="ghost" onClick={skipScan} className="flex-1 text-muted-foreground">
                    {t("onboarding.skip")}
                  </Button>
                )}
                {scanStep === "scanning" && (
                  <Button variant="ghost" onClick={skipScan} className="flex-1 text-muted-foreground">
                    {t("onboarding.skip")}
                  </Button>
                )}
                {scanStep === "done" && (
                  <Button onClick={() => setStep(3)} className="flex-1">
                    {t("onboarding.continue")} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 (buyer): Profile form ── */}
          {step === 3 && role === "buyer" && (
            <motion.div key="step3-buyer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
              <h2 className="text-lg font-heading font-semibold text-center">{t("onboarding.yourProfile")}</h2>
              {cardPreview && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("onboarding.autoFilled")}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>{t("onboarding.jobTitle")}</Label>
                  <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Procurement Manager" />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.company")}</Label>
                  <Input value={buyerCompany} onChange={e => setBuyerCompany(e.target.value)} placeholder="Acme Corp" />
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
                  <Label>{t("onboarding.phone")}</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 0000" />
                </div>
                <div>
                  <Label>{t("auth.email")}</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" type="email" />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.website")}</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://company.com" />
                </div>
                <div className="col-span-2">
                  <Label>{t("onboarding.linkedin")}</Label>
                  <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourname" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">{t("onboarding.back")}</Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("onboarding.settingUp")}</> : t("onboarding.finishSetup")}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2 (exhibitor): Booth setup ── */}
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
                    <img src={logo} className="w-20 h-20 rounded-lg object-cover" alt="Logo" />
                    <button onClick={() => setLogo(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
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