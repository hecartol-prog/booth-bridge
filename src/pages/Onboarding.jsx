import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QrCode, Briefcase, ShoppingBag, ArrowRight, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INTERESTS = [
  "Sustainable Products", "AI & Tech", "Machinery", "Packaging",
  "Food & Beverage", "Fashion & Textiles", "Electronics",
  "Healthcare", "Construction", "Energy", "Logistics", "Agriculture"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState(null);
  const [saving, setSaving] = useState(false);

  // Exhibitor fields
  const [companyName, setCompanyName] = useState("");
  const [boothNumber, setBoothNumber] = useState("");
  const [eventName, setEventName] = useState("");
  const [logo, setLogo] = useState(null);

  // Buyer fields
  const [jobTitle, setJobTitle] = useState("");
  const [buyerCompany, setBuyerCompany] = useState("");
  const [interests, setInterests] = useState([]);

  const toggleInterest = (interest) => {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogo(file_url);
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
        digital_card: { name: me.full_name, email: me.email, title: "Exhibitor" }
      });
      await base44.auth.updateMe({ role: "exhibitor", onboarded: true, profile_id: profile.id });
    } else {
      const profile = await base44.entities.BuyerProfile.create({
        user_id: me.id,
        job_title: jobTitle,
        company: buyerCompany,
        interests,
        digital_card: { name: me.full_name, email: me.email, title: jobTitle }
      });
      await base44.auth.updateMe({ role: "buyer", onboarded: true, profile_id: profile.id });
    }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold">Welcome to Booth Bridge</h1>
          <p className="text-muted-foreground mt-1 text-sm">Let's set up your profile</p>
        </div>

        <div className="flex gap-2 mb-6 justify-center">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? "w-12 bg-primary" : "w-8 bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-lg font-heading font-semibold mb-4 text-center">I am an...</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-md text-center ${role === "exhibitor" ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onClick={() => setRole("exhibitor")}
                >
                  <Briefcase className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-semibold">Exhibitor</p>
                  <p className="text-xs text-muted-foreground mt-1">Booth staff</p>
                </Card>
                <Card
                  className={`p-6 cursor-pointer transition-all hover:shadow-md text-center ${role === "buyer" ? "ring-2 ring-primary bg-primary/5" : ""}`}
                  onClick={() => setRole("buyer")}
                >
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-primary" />
                  <p className="font-semibold">Buyer</p>
                  <p className="text-xs text-muted-foreground mt-1">Attendee</p>
                </Card>
              </div>
              <Button
                className="w-full mt-6"
                disabled={!role}
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {step === 2 && role === "exhibitor" && (
            <motion.div key="step2-exhibitor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-lg font-heading font-semibold text-center">Set up your booth</h2>
              <div>
                <Label>Company Name *</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <Label>Booth Number *</Label>
                <Input value={boothNumber} onChange={e => setBoothNumber(e.target.value)} placeholder="A-42" />
              </div>
              <div>
                <Label>Event Name *</Label>
                <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="CES 2026" />
              </div>
              <div>
                <Label>Company Logo</Label>
                {logo ? (
                  <div className="relative w-20 h-20 mt-2">
                    <img src={logo} className="w-20 h-20 rounded-lg object-cover" alt="Logo" />
                    <button onClick={() => setLogo(null)} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 mt-2 px-4 py-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={handleFinish} disabled={!companyName || !boothNumber || !eventName || saving} className="flex-1">
                  {saving ? "Setting up..." : "Finish Setup"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && role === "buyer" && (
            <motion.div key="step2-buyer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-lg font-heading font-semibold text-center">Your profile</h2>
              <div>
                <Label>Job Title</Label>
                <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Procurement Manager" />
              </div>
              <div>
                <Label>Company (optional)</Label>
                <Input value={buyerCompany} onChange={e => setBuyerCompany(e.target.value)} placeholder="TechCorp" />
              </div>
              <div>
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {INTERESTS.map(interest => (
                    <Badge
                      key={interest}
                      variant={interests.includes(interest) ? "default" : "outline"}
                      className="cursor-pointer transition-all"
                      onClick={() => toggleInterest(interest)}
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={handleFinish} disabled={saving} className="flex-1">
                  {saving ? "Setting up..." : "Finish Setup"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}