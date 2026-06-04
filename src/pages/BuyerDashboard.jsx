import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bookmark, Camera, Package,
  ArrowRight, Building2, FileText, TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { format } from "date-fns";
import DigitalBooth from "./DigitalBooth";

export default function BuyerDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [viewBooth, setViewBooth] = useState(null);

  const { data: savedBooths = [] } = useQuery({
    queryKey: ["buyer-saved-booths", user?.id],
    queryFn: () => base44.entities.SavedBooth.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: savedProducts = [] } = useQuery({
    queryKey: ["buyer-saved-products", user?.id],
    queryFn: () => base44.entities.SavedProduct.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ["buyer-rfis", user?.id],
    queryFn: () => base44.entities.RFI.filter({ buyer_user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: profile } = useQuery({
    queryKey: ["buyer-profile", user?.id],
    queryFn: async () => {
      const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
      return profiles[0] || null;
    },
    enabled: !!user?.id,
  });

  if (viewBooth) {
    return <DigitalBooth exhibitorUserId={viewBooth} onBack={() => setViewBooth(null)} />;
  }

  const stats = [
    { label: t("dashboard.savedBooths"), value: savedBooths.length, icon: Building2, color: "text-primary", path: "/saved-booths" },
    { label: t("dashboard.savedProducts"), value: savedProducts.length, icon: Package, color: "text-purple-600", path: "/my-library" },
    { label: t("dashboard.requestsSent"), value: rfis.length, icon: FileText, color: "text-amber-600", path: "/my-rfis" },
    { label: t("dashboard.followUps"), value: savedBooths.filter(b => b.visit_status === "follow_up").length, icon: TrendingUp, color: "text-green-600", path: "/saved-booths" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">
          {t("dashboard.hey")}, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {profile?.job_title && `${profile.job_title}`}
          {profile?.company && ` ${t("common.at")} ${profile.company}`}
          {!profile?.job_title && !profile?.company && t("dashboard.yourTradeShowBrain")}
        </p>
      </div>

      {/* Primary CTAs */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link to="/scan">
          <Card className="p-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer h-full">
            <Camera className="w-6 h-6 mb-2" />
            <p className="font-bold text-sm">{t("dashboard.scanBoothQR")}</p>
            <p className="text-xs opacity-80 mt-0.5">{t("dashboard.instantAccess")}</p>
          </Card>
        </Link>
        <Link to="/saved-booths">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
            <Bookmark className="w-6 h-6 text-primary mb-2" />
            <p className="font-bold text-sm">{t("dashboard.savedBooths")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{savedBooths.length} {t("dashboard.suppliers")}</p>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {stats.map(stat => (
          <Link key={stat.label} to={stat.path}>
            <Card className="p-3 text-center hover:shadow-md transition-shadow cursor-pointer">
              <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
              <p className="text-xl font-display font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
            </Card>
          </Link>
        ))}
      </div>

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
                      <p className="text-sm font-medium">{booth.exhibitor_company || "Exhibitor"}</p>
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
      {savedBooths.length === 0 && savedProducts.length === 0 && (
        <Card className="p-8 text-center">
          <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-sm">{t("dashboard.startExploring")}</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {t("dashboard.scanToAccess")}
          </p>
          <Link to="/scan">
            <Button size="sm">
              <Camera className="w-4 h-4 mr-2" /> {t("dashboard.scanFirstBooth")}
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}