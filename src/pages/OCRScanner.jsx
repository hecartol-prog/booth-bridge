import React, { useState, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { extractOcrScan } from "@/api/aiClient";
import { storage } from "@/api/storageClient";
import { uploadOcrScan } from "@/utils/assetPipeline";
import { db } from "@/utils/dbClient";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ScanLine, Camera, Upload, CheckCircle2, Loader2, Edit, Save, X
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { sanitizeOCRResult, validateFieldPattern } from "@/utils/securitySanitizer";

const SCAN_TYPES = [
  { id: "business_card", label: "Business Card", desc: "Scan paper business cards", icon: "🪪" },
  { id: "badge", label: "Event Badge", desc: "Scan trade show badges", icon: "🏷️" },
];

export default function OCRScanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const captureRef = useRef(null);
  const [scanType, setScanType] = useState("business_card");
  const [step, setStep] = useState("select"); // select | processing | review | saved
  const [imageUrl, setImageUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editData, setEditData] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const processFile = async (file) => {
    setStep("processing");
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => setPreviewUrl(event.target?.result || null);
      reader.readAsDataURL(file);

      const { file_url } = await uploadOcrScan(file, user?.id || "anonymous");
      const extractionUrl = (await storage.getSignedUrl(file_url)) || file_url;
      setImageUrl(file_url);
      const response = await extractOcrScan({ scanType: /** @type {"business_card" | "badge"} */ (scanType), imageUrl: extractionUrl });
      if (!response.success) throw new Error(response.error?.message || "OCR failed");
      const sanitized = sanitizeOCRResult(response.result);
      setEditData({ ...sanitized });
      setConfidence(sanitized.confidence || 75);
      setFieldErrors({});
      setStep("review");
    } catch {
      toast({ title: "OCR failed", description: "Could not process image. Please try again.", variant: "destructive" });
      setStep("select");
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSave = async () => {
    // Pre-save field validation
    const errors = {};
    if (editData?.email) {
      const r = validateFieldPattern(editData.email, "email");
      if (!r.valid) errors.email = r.reason;
    }
    if (editData?.phone) {
      const r = validateFieldPattern(editData.phone, "phone");
      if (!r.valid) errors.phone = r.reason;
    }
    if (editData?.full_name) {
      const r = validateFieldPattern(editData.full_name, "name_company");
      if (!r.valid) errors.full_name = r.reason;
    }
    if (editData?.company) {
      const r = validateFieldPattern(editData.company, "name_company");
      if (!r.valid) errors.company = r.reason;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const contact = await db.ScannedContact.create({
        scanned_by_user_id: user.id,
        scan_type: scanType,
        ...editData,
        raw_image_url: imageUrl,
        ocr_confidence: confidence,
        follow_up_status: "pending",
      });
      await db.Activity.create({
        activity_type: "scanned_qr",
        user_id: user.id,
        company_name: editData.company || "",
        points: scanType === "business_card" ? 20 : 15,
        source_module: "ocr_scanner",
        metadata: { scan_type: scanType, contact_id: contact.id },
      });
      queryClient.invalidateQueries({ queryKey: ["scanned-contacts", user?.id] });
      toast({ title: "Contact saved!", description: `${editData.full_name || editData.company || "Contact"} added.` });
      setStep("saved");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setLoading(false);
  };

  const reset = () => { setStep("select"); setEditData(null); setImageUrl(null); setPreviewUrl(null); setConfidence(null); setFieldErrors({}); };

  const confidenceColor = (c) => c >= 80 ? "text-green-600" : c >= 60 ? "text-amber-600" : "text-red-600";
  const confidenceLabel = (c) => c >= 80 ? "High Confidence" : c >= 60 ? "Medium Confidence" : "Low — please verify fields";

  const fields = scanType === "business_card" ? [
    { key: "full_name", label: "Full Name" },
    { key: "position", label: "Position" },
    { key: "company", label: "Company" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "mobile", label: "Mobile" },
    { key: "website", label: "Website" },
    { key: "country", label: "Country" },
    { key: "city", label: "City" },
    { key: "linkedin", label: "LinkedIn" },
  ] : [
    { key: "full_name", label: "Full Name" },
    { key: "company", label: "Company" },
    { key: "position", label: "Position" },
    { key: "country", label: "Country" },
    { key: "badge_number", label: "Badge Number" },
    { key: "booth_number", label: "Booth Number" },
    { key: "event_name", label: "Event Name" },
    { key: "industry", label: "Industry" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <ScanLine className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">OCR Scanner</h1>
          <p className="text-xs text-muted-foreground">Scan business cards and badges instantly</p>
        </div>
      </div>

      {/* Step: Select */}
      {step === "select" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose what to scan:</p>
          <div className="grid grid-cols-2 gap-3">
            {SCAN_TYPES.map(st => (
              <Card
                key={st.id}
                onClick={() => setScanType(st.id)}
                className={`p-4 cursor-pointer transition-all ${scanType === st.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:shadow-md"}`}
              >
                <div className="text-2xl mb-2">{st.icon}</div>
                <p className="font-semibold text-sm">{st.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{st.desc}</p>
              </Card>
            ))}
          </div>

          <input type="file" accept="image/*" capture="environment" ref={captureRef} className="hidden" onChange={handleFileChange} />
          <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFileChange} />

          <Button onClick={() => captureRef.current?.click()} className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" /> Take Photo
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
            <Upload className="w-4 h-4 mr-2" /> Upload from Gallery
          </Button>
        </div>
      )}

      {/* Step: Processing */}
      {step === "processing" && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="font-semibold">Processing Image...</p>
          <p className="text-sm text-muted-foreground mt-2">AI is extracting contact information</p>
        </div>
      )}

      {/* Step: Review */}
      {step === "review" && editData && (
        <div className="space-y-4">
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${confidence >= 80 ? "bg-green-50 border-green-200" : confidence >= 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
            <div className={`w-2 h-2 rounded-full ${confidence >= 80 ? "bg-green-500" : confidence >= 60 ? "bg-amber-500" : "bg-red-500"}`} />
            <p className={`text-sm font-medium ${confidenceColor(confidence)}`}>
              {confidenceLabel(confidence)} ({confidence}%)
            </p>
          </div>

          {previewUrl && (
            <img src={previewUrl} alt="Scanned" className="w-full rounded-xl object-cover max-h-40" />
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Edit className="w-4 h-4" /> Review and Edit Extracted Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map(f => (
                editData[f.key] !== undefined && (
                  <div key={f.key}>
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input
                      value={editData[f.key] || ""}
                      onChange={e => {
                        setEditData(prev => ({ ...prev, [f.key]: e.target.value }));
                        if (fieldErrors[f.key]) setFieldErrors(prev => ({ ...prev, [f.key]: null }));
                      }}
                      className={`mt-1 ${fieldErrors[f.key] ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                    />
                    {fieldErrors[f.key] && <p className="text-xs text-red-500 mt-0.5">{fieldErrors[f.key]}</p>}
                  </div>
                )
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Contact
            </Button>
            <Button variant="outline" onClick={reset}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Saved */}
      {step === "saved" && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <p className="font-semibold text-lg">Contact Saved!</p>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Added to your contacts and lead intelligence.</p>
          <div className="space-y-2">
            <Button onClick={reset} className="w-full">Scan Another</Button>
            <Button variant="outline" className="w-full" asChild>
              <a href="/contacts">View All Contacts</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}