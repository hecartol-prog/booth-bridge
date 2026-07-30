import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Package, ArrowRight, Building2, FileText, FolderPlus, SlidersHorizontal, Nfc, ScanLine
} from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import DigitalBooth from "./DigitalBooth";
import CreateProjectSheet from "@/components/buyer/CreateProjectSheet";
import ActionQueue from "@/components/buyer/ActionQueue";
import { computeFollowUpActions, computeStaleRFIs } from "@/utils/followUpChecker";
import { db } from "@/utils/dbClient";

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [viewBooth, setViewBooth] = useState(null);
  const [showProjectSheet, setShowProjectSheet] = useState(false);
  const activeMeetingStatuses = new Set(["proposed", "accepted"]);

  const { data: savedBooths = [] } = useQuery({
    queryKey: ["buyer-saved-booths", user?.id],
    queryFn: () => db.SavedBooth.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: savedProducts = [] } = useQuery({
    queryKey: ["buyer-saved-products", user?.id],
    queryFn: () => db.SavedProduct.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ["buyer-rfis", user?.id],
    queryFn: () => db.RFI.filter({ buyer_user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ["buyer-profile", user?.id],
    queryFn: async () => {
      const profiles = await db.BuyerProfile.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["sourcing-projects", user?.id],
    queryFn: () => db.SourcingProject.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ["buyer-upcoming-meetings", user?.id],
    queryFn: async () => {
      const [asRecipient, asProposer] = await Promise.all([
        db.Meeting.filter({ proposed_to: user.id }),
        db.Meeting.filter({ proposed_by: user.id }),
      ]);
      const seen = new Set();

      return [...asRecipient, ...asProposer]
        .filter((meeting) => {
          if (!meeting?.id || seen.has(meeting.id)) return false;
          seen.add(meeting.id);
          return activeMeetingStatuses.has(meeting.status) &&
            meeting.proposed_time &&
            new Date(meeting.proposed_time) > new Date();
        })
        .sort((a, b) => new Date(a.proposed_time).getTime() - new Date(b.proposed_time).getTime())
        .slice(0, 5);
    },
    enabled: !!user?.id,
  });

  if (viewBooth) {
    return <DigitalBooth exhibitorUserId={viewBooth} onBack={() => setViewBooth(null)} />;
  }

  // Computed action items
  const followUpActions = computeFollowUpActions(savedBooths);
  const staleRFIs = computeStaleRFIs(rfis);

  const handleMarkResponded = async (boothId) => {
    await db.SavedBooth.update(boothId, { visit_status: "follow_up" });
    queryClient.invalidateQueries({ queryKey: ["buyer-saved-booths", user?.id] });
  };

  const stats = [
    { label: t("dashboard.savedBooths"), value: savedBooths.length, icon: Building2, color: "text-primary", path: "/saved-booths" },
    { label: t("dashboard.savedProducts"), value: savedProducts.length, icon: Package, color: "text-purple-600", path: "/my-library" },
    { label: t("dashboard.requestsSent"), value: rfis.length, icon: FileText, color: "text-amber-600", path: "/my-rfis" },
    { label: t("dashboard.projects"), value: projects.length, icon: FolderPlus, color: "text-green-600", path: "/workspace/compare" },
  ];

  const activeProjects = projects.filter(p => p.status === "active");

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold">
          {t("dashboard.hey")}, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {profile?.job_title && `${profile.job_title}`}
          {profile?.company && ` ${t("common.at")} ${profile.company}`}
          {!profile?.job_title && !profile?.company && t("dashboard.yourTradeShowBrain")}
        </p>
      </div>

      {/* Primary CTAs — 3 capture methods */}
      <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 mb-3">
        <Link to="/scan">
          <Card className="p-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer h-full text-center">
            <Camera className="w-5 h-5 mb-1 mx-auto" />
            <p className="font-bold text-xs">{t("dashboard.qrScan")}</p>
          </Card>
        </Link>
        <Link to="/nfc">
          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer h-full text-center bg-blue-600 text-white hover:bg-blue-700">
            <Nfc className="w-5 h-5 mb-1 mx-auto" />
            <p className="font-bold text-xs">{t("dashboard.nfcTap")}</p>
          </Card>
        </Link>
        <Link to="/ocr-scanner">
          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer h-full text-center bg-purple-600 text-white hover:bg-purple-700">
            <ScanLine className="w-5 h-5 mb-1 mx-auto" />
            <p className="font-bold text-xs">{t("dashboard.ocrScan")}</p>
          </Card>
        </Link>
      </div>
      <div className="mb-5">
        <Card
          className="p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setShowProjectSheet(true)}
        >
          <div className="flex items-center gap-3">
            <FolderPlus className="w-6 h-6 text-primary" />
            <div>
              <p className="font-bold text-sm">{t("dashboard.newSourcingProject")}</p>
              <p className="text-xs text-muted-foreground">{t("dashboard.newSourcingProjectSubtitle")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {stats.map(stat => (
          <Link key={stat.label} to={stat.path}>
            <Card className="p-3 text-center hover:shadow-md transition-shadow cursor-pointer">
              <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
              <p className="text-xl font-display font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Action Queue — time-sensitive items */}
      <ActionQueue
        followUpActions={followUpActions}
        staleRFIs={staleRFIs}
        upcomingMeetings={upcomingMeetings}
        onMarkResponded={handleMarkResponded}
      />

      {/* Active sourcing projects */}
      {activeProjects.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-heading">{t("dashboard.activeProjects")}</CardTitle>
              <Link to="/workspace/compare" className="text-xs text-primary hover:underline flex items-center gap-1">
                {t("dashboard.compare")} <SlidersHorizontal className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeProjects.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.project_name}</p>
                    {p.target_moq && <p className="text-xs text-muted-foreground">MOQ: {p.target_moq}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent saved booths */}
      {savedBooths.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-heading">{t("dashboard.recentBooths")}</CardTitle>
              <Link to="/saved-booths" className="text-xs text-primary hover:underline flex items-center gap-1">
                {t("dashboard.viewAll")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedBooths.slice(0, 4).map(booth => (
                <button
                  key={booth.id}
                  className="w-full flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 rounded px-1 transition-colors text-left"
                  onClick={() => setViewBooth(booth.exhibitor_user_id)}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{booth.exhibitor_company || t("dashboard.exhibitor")}</p>
                      <p className="text-xs text-muted-foreground">
                        {booth.booth_number && `${t("dashboard.booth")} ${booth.booth_number}`}
                        {booth.event_name && ` · ${booth.event_name}`}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent saved products */}
      {savedProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-heading">{t("dashboard.recentProducts")}</CardTitle>
              <Link to="/my-library" className="text-xs text-primary hover:underline flex items-center gap-1">
                {t("dashboard.viewAll")} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {savedProducts.slice(0, 6).map(p => (
                <div key={p.id} className="shrink-0 w-20">
                  {p.product_image_url ? (
                    <img src={p.product_image_url} className="w-20 h-20 rounded-lg object-cover" alt={p.product_title} />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-[10px] mt-1 truncate text-muted-foreground">{p.product_title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {savedBooths.length === 0 && savedProducts.length === 0 && followUpActions.length === 0 && (
        <Card className="p-8 text-center">
          <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-sm">{t("dashboard.startExploring")}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{t("dashboard.scanToAccess")}</p>
          <Link to="/scan">
            <Button size="sm">
              <Camera className="w-4 h-4 mr-2" /> {t("dashboard.scanFirstBooth")}
            </Button>
          </Link>
        </Card>
      )}

      <CreateProjectSheet
        open={showProjectSheet}
        onOpenChange={setShowProjectSheet}
        buyerId={user?.id}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["sourcing-projects", user?.id] })}
      />
    </div>
  );
}