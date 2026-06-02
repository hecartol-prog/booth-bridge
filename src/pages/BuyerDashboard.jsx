import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Inbox, Calendar, Camera, CreditCard, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

export default function BuyerDashboard() {
  const { user } = useAuth();

  const { data: connections = [] } = useQuery({
    queryKey: ["buyer-connections", user?.id],
    queryFn: () => base44.entities.Connection.filter({ buyer_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: rfis = [] } = useQuery({
    queryKey: ["buyer-rfis", user?.id],
    queryFn: () => base44.entities.RFI.filter({ buyer_user_id: user.id }),
    enabled: !!user?.id,
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ["buyer-meetings", user?.id],
    queryFn: () => base44.entities.Meeting.filter({ proposed_by: user.id }),
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

  const accepted = connections.filter(c => c.status === "accepted");
  const pendingRfis = rfis.filter(r => r.status === "pending");

  const quickActions = [
    { label: "Scan QR", icon: Camera, path: "/scan", desc: "Connect with exhibitors" },
    { label: "My Connections", icon: Users, path: "/connections", desc: `${accepted.length} exhibitors` },
    { label: "My RFIs", icon: Inbox, path: "/my-rfis", desc: `${pendingRfis.length} pending` },
    { label: "Meetings", icon: Calendar, path: "/meetings", desc: "Schedule & manage" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">
          Hey, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile?.job_title && `${profile.job_title}`}
          {profile?.company && ` at ${profile.company}`}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickActions.map(action => (
          <Link key={action.path} to={action.path}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
              <action.icon className="w-6 h-6 text-primary mb-2" />
              <p className="font-semibold text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </Card>
          </Link>
        ))}
      </div>

      {/* Interests */}
      {profile?.interests?.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-heading">My Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map(i => (
                <Badge key={i} variant="outline">{i}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent connections */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-heading">Recent Connections</CardTitle>
            <Link to="/connections" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {accepted.length === 0 ? (
            <div className="text-center py-6">
              <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No connections yet</p>
              <Link to="/scan" className="text-xs text-primary hover:underline">Scan a QR code to start</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {accepted.slice(0, 5).map(conn => (
                <div key={conn.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{conn.exhibitor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {conn.exhibitor_company} · Booth {conn.booth_number}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(conn.created_date), "MMM d")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}