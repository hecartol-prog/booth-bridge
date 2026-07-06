import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadCompanyLogo, uploadProductImage, uploadCatalog } from "@/utils/assetPipeline";
import { storage } from "@/api/storageClient";
import { db } from "@/utils/dbClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Building2, Package, FileText, LayoutGrid, QrCode, Rocket,
  CheckCircle2, Upload, Loader2, ArrowRight, ArrowLeft, Star, X,
  AlertCircle, Wifi, XCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  { id: 1, label: "Company", icon: Building2 },
  { id: 2, label: "Products", icon: Package },
  { id: 3, label: "Catalogs", icon: FileText },
  { id: 4, label: "Booth", icon: LayoutGrid },
  { id: 5, label: "Capture", icon: QrCode },
  { id: 6, label: "Launch", icon: Rocket },
];

function StepHeader({ current }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all
              ${current === s.id ? "bg-primary text-primary-foreground shadow-md scale-110"
                : current > s.id ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"}`}>
              {current > s.id ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
            </div>
            <span className={`text-[10px] font-medium ${current === s.id ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 transition-all ${current > s.id ? "bg-green-400" : "bg-muted"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ScoreBadge({ score }) {
  const tier = score >= 90 ? { label: "Launch Ready 🚀", color: "bg-green-100 text-green-700" }
    : score >= 75 ? { label: "Gold Booth 🥇", color: "bg-amber-100 text-amber-700" }
    : score >= 50 ? { label: "Silver Booth 🥈", color: "bg-slate-100 text-slate-700" }
    : { label: "Bronze Booth 🥉", color: "bg-orange-100 text-orange-700" };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${tier.color}`}>{tier.label}</span>
      <span className="text-sm font-bold w-10 text-right">{score}%</span>
    </div>
  );
}

export default function ExhibitorSetupWizard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 – Company
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Step 2 – Products
  const [productName, setProductName] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productMoq, setProductMoq] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productImagePreviewUrl, setProductImagePreviewUrl] = useState("");
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  // Step 4 – Booth
  const [boothNumber, setBoothNumber] = useState("");
  const [eventName, setEventName] = useState("");

  // Load existing profile
  const { data: profiles = [] } = useQuery({
    queryKey: ["esw-profile", user?.id],
    queryFn: () => db.ExhibitorProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: myProducts = [], refetch: refetchProducts } = useQuery({
    queryKey: ["esw-products", user?.id],
    queryFn: () => db.Product.filter({ exhibitor_user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: myCatalogs = [], refetch: refetchCatalogs } = useQuery({
    queryKey: ["esw-catalogs", user?.id],
    queryFn: () => db.CatalogItem.filter({ exhibitor_user_id: user?.id }),
    enabled: !!user?.id,
  });

  const { data: myNFC = [] } = useQuery({
    queryKey: ["esw-nfc", user?.id],
    queryFn: () => db.NFCProfile.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const profile = profiles[0];

  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || "");
      setDescription(profile.description || "");
      setCountry(profile.country || "");
      setWebsite(profile.website || "");
      setPhone(profile.phone || "");
      setLogoUrl(profile.logo_url || "");
      setLogoPreviewUrl(profile.logo_url || "");
      setBoothNumber(profile.booth_number || "");
      setEventName(profile.event_name || "");
    }
  }, [profile]);

  // Score calculation
  const score = Math.round([
    logoUrl ? 15 : 0,
    description?.length > 10 ? 10 : 0,
    country ? 5 : 0,
    website ? 5 : 0,
    phone ? 5 : 0,
    myProducts.length > 0 ? 20 : 0,
    myCatalogs.length > 0 ? 15 : 0,
    boothNumber ? 15 : 0,
    myNFC.length > 0 && myNFC[0]?.active ? 10 : 0,
  ].reduce((a, b) => a + b, 0));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await uploadCompanyLogo(file, user.id);
    setLogoUrl(file_url);
    setLogoPreviewUrl((await storage.getSignedUrl(file_url)) || file_url);
    setUploadingLogo(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const data = {
      user_id: user.id,
      company_name: companyName,
      description,
      country,
      website,
      phone,
      logo_url: logoUrl,
      booth_number: boothNumber,
      event_name: eventName,
    };
    if (profile) {
      await db.ExhibitorProfile.update(profile.id, data);
    } else {
      await db.ExhibitorProfile.create(data);
    }
    qc.invalidateQueries({ queryKey: ["esw-profile"] });
    setSaving(false);
  };

  const handleProductImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingProductImage(true);
    const { file_url } = await uploadProductImage(file, user.id);
    setProductImageUrl(file_url);
    setProductImagePreviewUrl((await storage.getSignedUrl(file_url)) || file_url);
    setUploadingProductImage(false);
  };

  const addProduct = async () => {
    if (!productName || !productImageUrl) return;
    setAddingProduct(true);
    await db.Product.create({
      exhibitor_user_id: user.id,
      title: productName,
      description: productDesc,
      image_url: productImageUrl,
    });
    setProductName(""); setProductDesc(""); setProductMoq(""); setProductImageUrl(""); setProductImagePreviewUrl("");
    refetchProducts();
    setAddingProduct(false);
  };

  const handleCatalogUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { file_url } = await uploadCatalog(file, { userId: user.id, companyId: profile?.id });
    const isVideo = file.type.startsWith("video/");
    await db.CatalogItem.create({
      exhibitor_user_id: user.id,
      title: file.name,
      file_url,
      type: isVideo ? "video" : "product_catalog",
    });
    refetchCatalogs();
  };

  const handleNext = async () => {
    if (step === 1 || step === 4) await saveProfile();
    setStep(s => Math.min(s + 1, 6));
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-display font-bold">Exhibitor Setup Wizard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Get your booth launch-ready step by step</p>
      </div>

      <div className="mb-4">
        <ScoreBadge score={score} />
      </div>

      <Card>
        <CardContent className="p-6">
          <StepHeader current={step} />

          {/* STEP 1 — Company Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Company Profile</h2>
              <div>
                <Label>Company Logo</Label>
                {logoUrl ? (
                  <div className="relative w-20 h-20 mt-2">
                    <img src={logoPreviewUrl || logoUrl} className="w-20 h-20 rounded-lg object-cover border" alt="Logo" />
                    <button onClick={() => { setLogoUrl(""); setLogoPreviewUrl(""); }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 mt-2 px-4 py-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{uploadingLogo ? "Uploading..." : "Upload logo (PNG, JPG)"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                )}
              </div>
              <div>
                <Label>Company Name *</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" />
              </div>
              <div>
                <Label>Description *</Label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your company, products, and specialties..."
                  className="w-full min-h-20 px-3 py-2 text-sm border rounded-md resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Country</Label>
                  <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="China" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+86 10 1234 5678" />
                </div>
              </div>
              <div>
                <Label>Website</Label>
                <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://company.com" />
              </div>
            </div>
          )}

          {/* STEP 2 — Products */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Upload Products ({myProducts.length})</h2>
              <div className="space-y-2">
                {myProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Package className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      {p.moq && <p className="text-xs text-muted-foreground">MOQ: {p.moq}</p>}
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  </div>
                ))}
              </div>
              <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                <p className="text-sm font-medium">Add Product</p>
                <Input placeholder="Product name *" value={productName} onChange={e => setProductName(e.target.value)} />
                <Input placeholder="Short description" value={productDesc} onChange={e => setProductDesc(e.target.value)} />
                {/* Product image upload */}
                {productImageUrl ? (
                  <div className="relative w-20 h-20">
                    <img src={productImagePreviewUrl || productImageUrl} className="w-20 h-20 rounded-lg object-cover border" alt="Product" />
                    <button onClick={() => { setProductImageUrl(""); setProductImagePreviewUrl(""); }} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 px-4 py-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    {uploadingProductImage ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                    <span className="text-sm text-muted-foreground">{uploadingProductImage ? "Uploading..." : "Product image * (JPG, PNG)"}</span>
                    <input type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handleProductImageUpload} disabled={uploadingProductImage} />
                  </label>
                )}
                <Button size="sm" onClick={addProduct} disabled={!productName || !productImageUrl || addingProduct}>
                  {addingProduct ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Add Product
                </Button>
              </div>
              {myProducts.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Add at least 1 product for a higher readiness score
                </p>
              )}
            </div>
          )}

          {/* STEP 3 — Catalogs */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Catalogs & Brochures ({myCatalogs.length})</h2>
              <div className="space-y-2">
                {myCatalogs.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm truncate flex-1">{c.title}</p>
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  </div>
                ))}
              </div>
              <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium text-sm">Upload PDF, Brochure, or Video</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, images, or video files</p>
                </div>
                <input type="file" accept=".pdf,image/*,video/*" className="hidden" onChange={handleCatalogUpload} />
              </label>
            </div>
          )}

          {/* STEP 4 — Booth Setup */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Booth Setup</h2>
              <div>
                <Label>Event Name *</Label>
                <Input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="CES 2026" />
              </div>
              <div>
                <Label>Booth Number *</Label>
                <Input value={boothNumber} onChange={e => setBoothNumber(e.target.value)} placeholder="A-42" />
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Featured Products & Team</p>
                <p>Manage featured products and team members from your <Link to="/" className="text-primary underline">Exhibitor Dashboard</Link> after completing setup.</p>
              </div>
            </div>
          )}

          {/* STEP 5 — Capture Activation */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg">Capture Activation</h2>
              <div className="grid gap-3">
                <Link to="/qr">
                  <div className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Generate & Verify QR Code</p>
                      <p className="text-xs text-muted-foreground">Print your booth QR code for visitor scans</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
                <Link to="/nfc">
                  <div className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${myNFC.length > 0 ? "bg-green-100" : "bg-muted"}`}>
                      <Wifi className={`w-5 h-5 ${myNFC.length > 0 ? "text-green-600" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Assign & Activate NFC Badge</p>
                      <p className="text-xs text-muted-foreground">
                        {myNFC.length > 0 ? "✓ NFC badge is active" : "Set up your NFC smart badge for tap-to-connect"}
                      </p>
                    </div>
                    {myNFC.length > 0 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* STEP 6 — Launch Review */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg text-center">Launch Review</h2>
              <div className="flex flex-col items-center py-4">
                <div className="relative w-28 h-28">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    <circle cx="60" cy="60" r="54" fill="none"
                      stroke={score >= 90 ? "#22c55e" : score >= 75 ? "#f59e0b" : "#f97316"}
                      strokeWidth="12"
                      strokeDasharray={2 * Math.PI * 54}
                      strokeDashoffset={2 * Math.PI * 54 * (1 - score / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{score}%</span>
                    <span className="text-[10px] text-muted-foreground">ready</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Company Profile", done: !!(companyName && description && logoUrl) },
                  { label: "Products Added", done: myProducts.length > 0 },
                  { label: "Catalog Uploaded", done: myCatalogs.length > 0 },
                  { label: "Booth Configured", done: !!(boothNumber && eventName) },
                  { label: "QR Code Ready", done: true }, // QR is auto-generated
                  { label: "NFC Badge Active", done: myNFC.length > 0 && myNFC[0]?.active },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    {item.done
                      ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                    <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                    {!item.done && <span className="text-xs text-amber-600 ml-auto">Incomplete</span>}
                  </div>
                ))}
              </div>

              {score >= 90 ? (
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <Rocket className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">You're Launch Ready! 🚀</p>
                  <p className="text-xs text-green-700 mt-1">Your booth is fully configured for the event.</p>
                </div>
              ) : (
                <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-semibold text-amber-800">Almost there!</p>
                  <p className="text-xs text-amber-700 mt-1">Complete the remaining items to reach Launch Ready status.</p>
                </div>
              )}

              <Link to="/">
                <Button className="w-full">Go to Dashboard <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </div>
          )}

          {/* Navigation */}
          {step < 6 && (
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <Button onClick={handleNext} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {step === 5 ? "Finish & Review" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}