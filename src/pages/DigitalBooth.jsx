import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Building2, Globe, Mail, Phone, MessageCircle, Download, Bookmark,
  BookmarkCheck, Package, FileText, ExternalLink, MapPin, ArrowLeft,
  Share2, ChevronRight, Image
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

const catalogTypeLabels = {
  company_profile: "Company Profile",
  product_catalog: "Product Catalog",
  new_collection: "New Collection",
  factory_presentation: "Factory",
  certificates: "Certificates",
  price_list: "Price List",
  video: "Video",
  other: "Document",
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

// This component receives exhibitorUserId as prop (passed from ScanQR or Discover)
export default function DigitalBooth({ exhibitorUserId, onBack }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saveDialog, setSaveDialog] = useState(false);
  const [saveNotes, setSaveNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState("interested");
  const [rfiDialog, setRfiDialog] = useState(false);
  const [rfiType, setRfiType] = useState("brochure");
  const [rfiMessage, setRfiMessage] = useState("");

  const isBuyer = user?.role !== "exhibitor";

  const { data: profile } = useQuery({
    queryKey: ["digital-booth-profile", exhibitorUserId],
    queryFn: async () => {
      const profiles = await base44.entities.ExhibitorProfile.filter({ user_id: exhibitorUserId });
      return profiles[0] || null;
    },
    enabled: !!exhibitorUserId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["digital-booth-products", exhibitorUserId],
    queryFn: () => base44.entities.Product.filter({ exhibitor_user_id: exhibitorUserId }),
    enabled: !!exhibitorUserId,
  });

  const { data: catalogs = [] } = useQuery({
    queryKey: ["digital-booth-catalogs", exhibitorUserId],
    queryFn: () => base44.entities.CatalogItem.filter({ exhibitor_user_id: exhibitorUserId }),
    enabled: !!exhibitorUserId,
  });

  const { data: savedBooth } = useQuery({
    queryKey: ["saved-booth-check", user?.id, exhibitorUserId],
    queryFn: async () => {
      if (!user?.id) return null;
      const saved = await base44.entities.SavedBooth.filter({ buyer_id: user.id, exhibitor_user_id: exhibitorUserId });
      return saved[0] || null;
    },
    enabled: !!user?.id && !!exhibitorUserId && isBuyer,
  });

  const saveBoothMutation = useMutation({
    mutationFn: () => base44.entities.SavedBooth.create({
      buyer_id: user.id,
      exhibitor_user_id: exhibitorUserId,
      exhibitor_profile_id: profile?.id,
      exhibitor_company: profile?.company_name,
      booth_number: profile?.booth_number,
      event_name: profile?.event_name,
      notes: saveNotes,
      visit_status: saveStatus,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-booth-check"] });
      queryClient.invalidateQueries({ queryKey: ["saved-booths"] });
      setSaveDialog(false);
      toast({ title: "Booth saved!", description: `${profile?.company_name} added to your saved booths.` });
    },
  });

  const rfiMutation = useMutation({
    mutationFn: () => base44.entities.RFI.create({
      buyer_user_id: user.id,
      exhibitor_user_id: exhibitorUserId,
      request_type: rfiType,
      message: rfiMessage,
      status: "pending",
      buyer_name: user.full_name,
      exhibitor_company: profile?.company_name,
    }),
    onSuccess: async () => {
      await base44.entities.Notification.create({
        user_id: exhibitorUserId,
        type: "rfi_received",
        title: "New Request Received",
        message: `${user.full_name} sent a ${rfiType.replace(/_/g, " ")} request.`,
        from_user_name: user.full_name,
      });
      setRfiDialog(false);
      setRfiMessage("");
      toast({ title: "Request sent!", description: "The exhibitor will be notified." });
    },
  });

  const handleDownload = async (catalog) => {
    await base44.entities.CatalogItem.update(catalog.id, { download_count: (catalog.download_count || 0) + 1 });
    window.open(catalog.file_url, "_blank");
  };

  if (!profile) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>Loading booth...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* Back button */}
      {onBack && (
        <div className="p-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      )}

      {/* Booth Header */}
      <div className="bg-primary px-6 pt-6 pb-8">
        <div className="flex items-center gap-4">
          {profile.logo_url ? (
            <img src={profile.logo_url} className="w-16 h-16 rounded-2xl object-cover bg-white" alt={profile.company_name} />
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
                  <MapPin className="w-3 h-3 mr-1" /> Booth {profile.booth_number}
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
        <div className="px-4 -mt-4 flex gap-2">
          <Button
            className="flex-1 shadow-lg"
            onClick={() => savedBooth ? null : setSaveDialog(true)}
            variant={savedBooth ? "outline" : "default"}
          >
            {savedBooth ? (
              <><BookmarkCheck className="w-4 h-4 mr-2 text-primary" /> Saved</>
            ) : (
              <><Bookmark className="w-4 h-4 mr-2" /> Save Booth</>
            )}
          </Button>
          <Button variant="outline" className="flex-1 shadow-lg" onClick={() => setRfiDialog(true)}>
            <FileText className="w-4 h-4 mr-2" /> Send Request
          </Button>
        </div>
      )}

      <div className="px-4 mt-4 space-y-4">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.digital_card?.email && (
              <a href={`mailto:${profile.digital_card.email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Mail className="w-4 h-4 text-muted-foreground" />
                {profile.digital_card.email}
              </a>
            )}
            {profile.digital_card?.phone && (
              <a href={`tel:${profile.digital_card.phone}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Phone className="w-4 h-4 text-muted-foreground" />
                {profile.digital_card.phone}
              </a>
            )}
            {profile.digital_card?.website && (
              <a href={profile.digital_card.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                <Globe className="w-4 h-4 text-muted-foreground" />
                {profile.digital_card.website}
              </a>
            )}
            {profile.digital_card?.linkedin && (
              <a href={profile.digital_card.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-primary">
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                LinkedIn Profile
              </a>
            )}
          </CardContent>
        </Card>

        {/* Catalog Library */}
        {catalogs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Catalog Library
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {catalogs.map(cat => {
                const Icon = catalogTypeIcons[cat.type] || FileText;
                return (
                  <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{cat.title}</p>
                        <p className="text-xs text-muted-foreground">{catalogTypeLabels[cat.type]}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(cat)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Products */}
        {products.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Products ({products.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {products.map(product => (
                  <SaveProductCard
                    key={product.id}
                    product={product}
                    user={user}
                    exhibitorUserId={exhibitorUserId}
                    profile={profile}
                    isBuyer={isBuyer}
                    queryClient={queryClient}
                    toast={toast}
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
            <DialogTitle>Save {profile.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={saveStatus} onValueChange={setSaveStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="request_quotation">Request Quotation</SelectItem>
                  <SelectItem value="sample_requested">Sample Requested</SelectItem>
                  <SelectItem value="supplier_approved">Supplier Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea
                value={saveNotes}
                onChange={e => setSaveNotes(e.target.value)}
                placeholder="Add notes about this supplier..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialog(false)}>Cancel</Button>
            <Button onClick={() => saveBoothMutation.mutate()} disabled={saveBoothMutation.isPending}>
              <Bookmark className="w-4 h-4 mr-2" /> Save Booth
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RFI Dialog */}
      <Dialog open={rfiDialog} onOpenChange={setRfiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Request to {profile.company_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Request Type</label>
              <Select value={rfiType} onValueChange={setRfiType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brochure">Request Catalog</SelectItem>
                  <SelectItem value="price_list">Request Quotation</SelectItem>
                  <SelectItem value="sample">Request Samples</SelectItem>
                  <SelectItem value="call_me">Request Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Message (optional)</label>
              <Textarea
                value={rfiMessage}
                onChange={e => setRfiMessage(e.target.value)}
                placeholder="Add details about your request..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRfiDialog(false)}>Cancel</Button>
            <Button onClick={() => rfiMutation.mutate()} disabled={rfiMutation.isPending}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for saving individual products
function SaveProductCard({ product, user, exhibitorUserId, profile, isBuyer, queryClient, toast }) {
  const { data: isSaved } = useQuery({
    queryKey: ["saved-product-check", user?.id, product.id],
    queryFn: async () => {
      const saved = await base44.entities.SavedProduct.filter({ buyer_id: user.id, product_id: product.id });
      return saved.length > 0;
    },
    enabled: !!user?.id && isBuyer,
  });

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.SavedProduct.create({
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
      toast({ title: "Product saved!", description: product.title });
    },
  });

  return (
    <div className="rounded-lg overflow-hidden border bg-card group relative">
      {product.image_url ? (
        <img src={product.image_url} alt={product.title} className="w-full aspect-square object-cover" />
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
          onClick={() => !isSaved && saveMutation.mutate()}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"
        >
          {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}