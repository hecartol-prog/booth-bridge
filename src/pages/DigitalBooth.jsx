import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AiBoothAssistant from "@/components/AiBoothAssistant";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Building2, Globe, Mail, Phone, Download, Bookmark,
  BookmarkCheck, Package, FileText, ExternalLink, MapPin, ArrowLeft, Image, Loader2, Video, Film, Plus, Calendar
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import OfflineBanner from "@/components/OfflineBanner";
import { enqueueVisitorAction, VISITOR_ACTIONS, getPendingVisitorCount } from "@/utils/visitorInteractionQueue";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { cacheWrite, cacheRead } from "@/utils/visitorCache";
import { db, addSupplierToProject } from "@/utils/dbClient";
import { storage } from "@/api/storageClient";
import { useI18n } from "@/lib/i18n";

const catalogTypeLabelKeys = {
  company_profile: "booth.catalogTypes.company_profile",
  product_catalog: "booth.catalogTypes.product_catalog",
  new_collection: "booth.catalogTypes.new_collection",
  factory_presentation: "booth.catalogTypes.factory_presentation",
  certificates: "booth.catalogTypes.certificates",
  price_list: "booth.catalogTypes.price_list",
  video: "booth.catalogTypes.video",
  other: "booth.catalogTypes.other",
};

const catalogTypeIcons = {
  company_profile: Building2,
  product_catalog: Package,
  new_collection: Package,
  factory_presentation: Building2,
  certificates: FileText,
  price_list: FileText,
  video: FileText,
  other: FileText,
};

export default function DigitalBooth({ exhibitorUserId, onBack }) {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saveDialog, setSaveDialog] = useState(false);
  const [saveNotes, setSaveNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState("interested");
  const [assignProjectId, setAssignProjectId] = useState("");
  const [rfiDialog, setRfiDialog] = useState(false);
  const [rfiType, setRfiType] = useState("brochure");
  const [rfiMessage, setRfiMessage] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [logoUrl, setLogoUrl] = useState(null);
  const [catalogUrls, setCatalogUrls] = useState({});
  const [productImageUrls, setProductImageUrls] = useState({});

  const isBuyer = user?.user_role !== "exhibitor";
  const BOOTH_CACHE_KEY = `booth:${exhibitorUserId}`;

  const { data: activeProjects = [] } = useQuery({
    queryKey: ["sourcing-projects", user?.id],
    queryFn: () => db.SourcingProject.filter({ buyer_id: user.id, status: "active" }),
    enabled: !!user?.id && isBuyer,
  });

  // Track online/offline
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const refreshPending = useCallback(async () => {
    setPendingCount(await getPendingVisitorCount());
  }, []);

  const resolveAssetUrl = useCallback(async (fileRef) => {
    if (!fileRef) return null;
    try {
      return (await storage.getSignedUrl(fileRef, { expiresIn: 900 })) || fileRef;
    } catch {
      return fileRef;
    }
  }, []);

  useEffect(() => { refreshPending(); }, [refreshPending]);

  useOfflineSync({
    onSyncComplete: (n) => {
      toast({ title: `${n} offline action${n > 1 ? "s" : ""} synced` });
      refreshPending();
    },
  });

  // ── Data fetching with cache fallback ───────────────────────────────────

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["digital-booth-profile", exhibitorUserId],
    queryFn: async () => {
      const profiles = await db.ExhibitorProfile.filter({ user_id: exhibitorUserId });
      const result = profiles[0] || null;
      if (result) {
        // Update cache alongside the live data
        const cached = cacheRead(BOOTH_CACHE_KEY) || {};
        cacheWrite(BOOTH_CACHE_KEY, { ...cached, profile: result });
      }
      return result;
    },
    enabled: !!exhibitorUserId,
    placeholderData: () => cacheRead(BOOTH_CACHE_KEY)?.profile || undefined,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["digital-booth-products", exhibitorUserId],
    queryFn: async () => {
      const result = await db.Product.filter({ exhibitor_user_id: exhibitorUserId });
      const cached = cacheRead(BOOTH_CACHE_KEY) || {};
      cacheWrite(BOOTH_CACHE_KEY, { ...cached, products: result });
      return result;
    },
    enabled: !!exhibitorUserId,
    placeholderData: () => cacheRead(BOOTH_CACHE_KEY)?.products || [],
  });

  const { data: catalogs = [] } = useQuery({
    queryKey: ["digital-booth-catalogs", exhibitorUserId],
    queryFn: async () => {
      const result = await db.CatalogItem.filter({ exhibitor_user_id: exhibitorUserId });
      const cached = cacheRead(BOOTH_CACHE_KEY) || {};
      cacheWrite(BOOTH_CACHE_KEY, { ...cached, catalogs: result });
      return result;
    },
    enabled: !!exhibitorUserId,
    placeholderData: () => cacheRead(BOOTH_CACHE_KEY)?.catalogs || [],
  });

  useEffect(() => {
    let active = true;

    const loadLogo = async () => {
      const resolved = await resolveAssetUrl(profile?.logo_url);
      if (active) setLogoUrl(resolved);
    };

    loadLogo();
    return () => { active = false; };
  }, [profile?.logo_url, resolveAssetUrl]);

  useEffect(() => {
    let active = true;

    const loadCatalogUrls = async () => {
      const entries = await Promise.all(
        catalogs.map(async (catalog) => [catalog.id, await resolveAssetUrl(catalog.file_url)]),
      );
      if (active) setCatalogUrls(Object.fromEntries(entries));
    };

    loadCatalogUrls();
    return () => { active = false; };
  }, [catalogs, resolveAssetUrl]);

  useEffect(() => {
    let active = true;

    const loadProductUrls = async () => {
      const entries = await Promise.all(
        products.map(async (product) => [product.id, await resolveAssetUrl(product.image_url)]),
      );
      if (active) setProductImageUrls(Object.fromEntries(entries));
    };

    loadProductUrls();
    return () => { active = false; };
  }, [products, resolveAssetUrl]);

  const { data: savedBooth } = useQuery({
    queryKey: ["saved-booth-check", user?.id, exhibitorUserId],
    queryFn: async () => {
      if (!user?.id) return null;
      const saved = await db.SavedBooth.filter({ buyer_id: user.id, exhibitor_user_id: exhibitorUserId });
      return saved[0] || null;
    },
    enabled: !!user?.id && !!exhibitorUserId && isBuyer,
  });

  const { data: existingConnection } = useQuery({
    queryKey: ["booth-connection", user?.id, exhibitorUserId],
    queryFn: async () => {
      if (!user?.id) return null;
      const conns = await db.Connection.filter({
        exhibitor_user_id: exhibitorUserId,
        buyer_user_id: user.id,
      });
      return conns[0] || null;
    },
    enabled: !!user?.id && !!exhibitorUserId && isBuyer,
  });

  // ── Save Booth ──────────────────────────────────────────────────────────

  const saveBoothMutation = useMutation({
    mutationFn: () => db.SavedBooth.create({
      buyer_id: user.id,
      exhibitor_user_id: exhibitorUserId,
      exhibitor_profile_id: profile?.id,
      exhibitor_company: profile?.company_name,
      booth_number: profile?.booth_number,
      event_name: profile?.event_name,
      notes: saveNotes,
      visit_status: saveStatus,
    }),
    onSuccess: async (savedBoothRecord) => {
      queryClient.invalidateQueries({ queryKey: ["saved-booth-check"] });
      queryClient.invalidateQueries({ queryKey: ["saved-booths"] });
      // Optionally assign to a sourcing project
      if (assignProjectId && user?.id) {
        await addSupplierToProject({
          project_id: assignProjectId,
          buyer_id: user.id,
          exhibitor_user_id: exhibitorUserId,
          exhibitor_profile_id: profile?.id,
          company_name: profile?.company_name,
          booth_number: profile?.booth_number,
          event_name: profile?.event_name,
        });
        queryClient.invalidateQueries({ queryKey: ["compare-mappings"] });
      }
      setSaveDialog(false);
      setAssignProjectId("");
      toast({
        title: t("booth.toast.boothSaved"),
        description: t("booth.toast.boothSavedDescription", { company: profile?.company_name || "" }),
      });
    },
  });

  const handleSaveBooth = async () => {
    if (!isOnline) {
      await enqueueVisitorAction({
        actionType: VISITOR_ACTIONS.SAVE_BOOTH,
        userId: user.id,
        exhibitorUserId,
        exhibitorProfileId: profile?.id,
        exhibitorCompany: profile?.company_name,
        boothNumber: profile?.booth_number,
        eventName: profile?.event_name,
        notes: saveNotes,
        visitStatus: saveStatus,
      });
      setSaveDialog(false);
      await refreshPending();
      toast({
        title: t("booth.toast.savedOffline"),
        description: t("booth.toast.boothSavedOfflineDescription"),
      });
      return;
    }
    saveBoothMutation.mutate();
  };

  // ── RFI ─────────────────────────────────────────────────────────────────

  const rfiMutation = useMutation({
    mutationFn: () => db.RFI.create({
      connection_id: existingConnection?.id || "",
      buyer_user_id: user.id,
      exhibitor_user_id: exhibitorUserId,
      request_type: rfiType,
      message: rfiMessage,
      status: "pending",
      buyer_name: user.full_name,
      exhibitor_company: profile?.company_name,
    }),
    onSuccess: async () => {
      await db.Notification.create({
        user_id: exhibitorUserId,
        type: "rfi_received",
        title: t("booth.notification.newRequestReceived"),
        message: t("booth.notification.requestReceivedMessage", {
          name: user.full_name,
          type: rfiType.replace(/_/g, " "),
        }),
        from_user_name: user.full_name,
      });
      setRfiDialog(false);
      setRfiMessage("");
      toast({
        title: t("booth.toast.requestSent"),
        description: t("booth.toast.requestSentDescription"),
      });
    },
  });

  const handleSubmitRfi = async () => {
    if (!isOnline) {
      await enqueueVisitorAction({
        actionType: VISITOR_ACTIONS.SUBMIT_RFI,
        userId: user.id,
        exhibitorUserId,
        connectionId: existingConnection?.id || "",
        rfiType,
        message: rfiMessage,
        buyerName: user.full_name,
        exhibitorCompany: profile?.company_name,
      });
      setRfiDialog(false);
      setRfiMessage("");
      await refreshPending();
      toast({
        title: t("booth.toast.rfiQueuedOffline"),
        description: t("booth.toast.rfiQueuedOfflineDescription"),
      });
      return;
    }
    rfiMutation.mutate();
  };

  // ── Catalog download ─────────────────────────────────────────────────────

  const handleDownload = async (catalog) => {
    if (!isOnline) {
      await enqueueVisitorAction({
        actionType: VISITOR_ACTIONS.DOWNLOAD_CATALOG,
        userId: user?.id,
        catalogId: catalog.id,
        currentCount: catalog.download_count || 0,
      });
      await refreshPending();
      toast({
        title: t("booth.toast.downloadQueuedOffline"),
        description: t("booth.toast.downloadQueuedOfflineDescription"),
      });
      return;
    }
    const href =
      catalogUrls[catalog.id] ||
      (await resolveAssetUrl(catalog.file_url)) ||
      catalog.file_url;
    if (href) {
      window.open(href, "_blank");
    }
    await db.CatalogItem.update(catalog.id, { download_count: (catalog.download_count || 0) + 1 });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Loading booth...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm mb-6 hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="font-semibold">Booth not found</p>
        <p className="text-sm mt-1">This exhibitor hasn't set up their profile yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {onBack && (
        <div className="p-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      )}

      {/* Offline / syncing banner */}
      <div className="px-4 pt-2">
        <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} />
      </div>

      {/* Booth Header */}
      <div className="bg-primary px-6 pt-6 pb-8">
        <div className="flex items-center gap-4">
          {profile.logo_url ? (
            <img src={logoUrl || profile.logo_url} className="w-16 h-16 rounded-2xl object-cover bg-white" alt={profile.company_name} />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-white truncate">{profile.company_name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {profile.booth_number && (
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  <MapPin className="w-3 h-3 mr-1" /> {t("booth.booth")} {profile.booth_number}
                </Badge>
              )}
              {profile.event_name && (
                <Badge className="bg-white/20 text-white border-0 text-xs">{profile.event_name}</Badge>
              )}
            </div>
          </div>
        </div>
        {profile.description && (
          <p className="text-white/80 text-sm mt-4 leading-relaxed">{profile.description}</p>
        )}
      </div>

      {/* Primary CTAs for buyers */}
      {isBuyer && (
        <div className="px-4 -mt-4 flex flex-col sm:flex-row gap-2">
          <Button
            className="flex-1 shadow-lg whitespace-normal h-auto min-h-9 py-2"
            onClick={() => savedBooth ? null : setSaveDialog(true)}
            variant={savedBooth ? "outline" : "default"}
          >
            {savedBooth ? (
              <><BookmarkCheck className="w-4 h-4 mr-2 text-primary" /> {t("booth.saved")}</>
            ) : (
              <><Bookmark className="w-4 h-4 mr-2" /> {t("booth.saveBooth")}</>
            )}
          </Button>
          <Button variant="outline" className="flex-1 shadow-lg whitespace-normal h-auto min-h-9 py-2" onClick={() => setRfiDialog(true)}>
            <FileText className="w-4 h-4 mr-2" /> {t("booth.sendRequest")}
          </Button>
          <Button variant="outline" className="flex-1 shadow-lg whitespace-normal h-auto min-h-9 py-2" onClick={() => navigate("/meetings")}>
            <Calendar className="w-4 h-4 mr-2" /> {t("booth.scheduleMeeting")}
          </Button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{t("booth.contact")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {profile.digital_card?.email && (
              <a href={`mailto:${profile.digital_card.email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Mail className="w-4 h-4 text-muted-foreground" /> {profile.digital_card.email}
              </a>
            )}
            {profile.digital_card?.phone && (
              <a href={`tel:${profile.digital_card.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Phone className="w-4 h-4 text-muted-foreground" /> {profile.digital_card.phone}
              </a>
            )}
            {profile.digital_card?.website && (
              <a href={profile.digital_card.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                <Globe className="w-4 h-4 text-muted-foreground" /> {profile.digital_card.website}
              </a>
            )}
            {profile.digital_card?.linkedin && (
              <a href={profile.digital_card.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                <ExternalLink className="w-4 h-4 text-muted-foreground" /> {t("booth.linkedinProfile")}
              </a>
            )}
          </CardContent>
        </Card>

        {/* Catalog Library — always shown */}
        {(() => {
          const docs = catalogs.filter(c => c.type !== "video");
          const videos = catalogs.filter(c => c.type === "video");
          const isOwnBooth = user?.id === exhibitorUserId;

          return (
            <>
              {/* Documents & Catalogs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> {t("booth.catalogsDocuments")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {docs.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">{t("booth.noDocuments")}</p>
                      {isOwnBooth && (
                        <a href="/catalog-library" className="text-xs text-primary hover:underline mt-1 block">
                          <Plus className="w-3 h-3 inline mr-0.5" />{t("booth.uploadCatalogs")}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {docs.map(cat => {
                        const Icon = catalogTypeIcons[cat.type] || FileText;
                        return (
                          <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{cat.title}</p>
                                <p className="text-xs text-muted-foreground">{t(catalogTypeLabelKeys[cat.type] || "booth.catalogTypes.other")}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleDownload(cat)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Videos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Film className="w-4 h-4 text-primary" /> {t("booth.videos")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {videos.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">{t("booth.noVideos")}</p>
                      {isOwnBooth && (
                        <a href="/catalog-library" className="text-xs text-primary hover:underline mt-1 block">
                          <Plus className="w-3 h-3 inline mr-0.5" />{t("booth.uploadVideo")}
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {videos.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                              <Video className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{cat.title}</p>
                              <p className="text-xs text-muted-foreground">{t("booth.catalogTypes.video")}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(cat)}>
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          );
        })()}

        {/* Products */}
        {products.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> {t("booth.products")} ({products.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {products.map(product => (
                  <SaveProductCard
                    key={product.id}
                    product={product}
                    resolvedImageUrl={productImageUrls[product.id] || product.image_url}
                    user={user}
                    exhibitorUserId={exhibitorUserId}
                    profile={profile}
                    isBuyer={isBuyer}
                    isOnline={isOnline}
                    queryClient={queryClient}
                    toast={toast}
                    onOfflineSave={refreshPending}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Save Booth Dialog */}
      <Dialog open={saveDialog} onOpenChange={setSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("booth.saveTitle", { company: profile.company_name })}</DialogTitle>
          </DialogHeader>
          {!isOnline && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              {t("booth.offlineSaveNotice")}
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("booth.status")}</label>
              <Select value={saveStatus} onValueChange={setSaveStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interested">{t("booth.saveStatuses.interested")}</SelectItem>
                  <SelectItem value="follow_up">{t("booth.saveStatuses.follow_up")}</SelectItem>
                  <SelectItem value="request_quotation">{t("booth.saveStatuses.request_quotation")}</SelectItem>
                  <SelectItem value="sample_requested">{t("booth.saveStatuses.sample_requested")}</SelectItem>
                  <SelectItem value="supplier_approved">{t("booth.saveStatuses.supplier_approved")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("booth.notes")}</label>
              <Textarea value={saveNotes} onChange={e => setSaveNotes(e.target.value)} placeholder={t("booth.notesPlaceholder")} rows={3} />
            </div>
            {activeProjects.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">{t("booth.addToProjectOptional")}</label>
                <Select value={assignProjectId} onValueChange={setAssignProjectId}>
                  <SelectTrigger><SelectValue placeholder={t("booth.selectProject")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>{t("booth.none")}</SelectItem>
                    {activeProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSaveBooth} disabled={saveBoothMutation.isPending}>
              {saveBoothMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bookmark className="w-4 h-4 mr-2" />}
              {isOnline ? t("booth.saveBooth") : t("booth.saveOffline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Booth Assistant */}
      <AiBoothAssistant profile={profile} products={products} catalogs={catalogs} />

      {/* RFI Dialog */}
      <Dialog open={rfiDialog} onOpenChange={setRfiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("booth.sendRequestTo", { company: profile.company_name })}</DialogTitle>
          </DialogHeader>
          {!isOnline && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              {t("booth.offlineRequestNotice")}
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">{t("booth.requestType")}</label>
              <Select value={rfiType} onValueChange={setRfiType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brochure">{t("booth.requestCatalog")}</SelectItem>
                  <SelectItem value="price_list">{t("booth.requestQuotation")}</SelectItem>
                  <SelectItem value="sample">{t("booth.requestSamples")}</SelectItem>
                  <SelectItem value="call_me">{t("booth.requestMeeting")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">{t("booth.messageOptional")}</label>
              <Textarea value={rfiMessage} onChange={e => setRfiMessage(e.target.value)} placeholder={t("booth.messagePlaceholder")} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRfiDialog(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmitRfi} disabled={rfiMutation.isPending}>
              {rfiMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isOnline ? t("booth.sendRequest") : t("booth.queueRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── SaveProductCard ──────────────────────────────────────────────────────────

function SaveProductCard({ product, resolvedImageUrl, user, exhibitorUserId, profile, isBuyer, isOnline, queryClient, toast, onOfflineSave }) {
  const { t } = useI18n();
  const { data: isSaved } = useQuery({
    queryKey: ["saved-product-check", user?.id, product.id],
    queryFn: async () => {
      const saved = await db.SavedProduct.filter({ buyer_id: user.id, product_id: product.id });
      return saved.length > 0;
    },
    enabled: !!user?.id && isBuyer,
  });

  const saveMutation = useMutation({
    mutationFn: () => db.SavedProduct.create({
      buyer_id: user.id,
      product_id: product.id,
      exhibitor_user_id: exhibitorUserId,
      exhibitor_company: profile?.company_name,
      event_name: profile?.event_name,
      product_title: product.title,
      product_image_url: product.image_url,
      interest_level: "medium",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-product-check", user?.id, product.id] });
      queryClient.invalidateQueries({ queryKey: ["saved-products"] });
      toast({ title: t("booth.toast.productSaved"), description: product.title });
    },
  });

  const handleSave = async () => {
    if (isSaved) return;
    if (!isOnline) {
      await enqueueVisitorAction({
        actionType: VISITOR_ACTIONS.SAVE_PRODUCT,
        userId: user.id,
        productId: product.id,
        exhibitorUserId,
        exhibitorCompany: profile?.company_name,
        eventName: profile?.event_name,
        productTitle: product.title,
        productImageUrl: product.image_url,
      });
      if (onOfflineSave) onOfflineSave();
      toast({
        title: t("booth.toast.savedOffline"),
        description: t("booth.toast.productSavedOfflineDescription", { product: product.title }),
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="rounded-lg overflow-hidden border bg-card group relative">
      {resolvedImageUrl ? (
        <img src={resolvedImageUrl} alt={product.title} className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center">
          <Image className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="p-2">
        <p className="text-xs font-medium truncate">{product.title}</p>
      </div>
      {isBuyer && (
        <button
          onClick={handleSave}
          aria-label={isSaved ? t("booth.saved") : t("booth.saveBooth")}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
        >
          {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}