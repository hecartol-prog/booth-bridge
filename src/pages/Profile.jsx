import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Mail, Building2, MapPin, Briefcase, LogOut } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const isExhibitor = user?.role === "exhibitor";

  const { data: profile } = useQuery({
    queryKey: ["profile-data", user?.id, user?.role],
    queryFn: async () => {
      if (isExhibitor) {
        const profiles = await base44.entities.ExhibitorProfile.filter({ user_id: user.id });
        return profiles[0];
      } else {
        const profiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
        return profiles[0];
      }
    },
    enabled: !!user?.id,
  });

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">Profile</h1>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            {isExhibitor && profile?.logo_url ? (
              <img src={profile.logo_url} className="w-16 h-16 rounded-2xl object-cover" alt="Logo" />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-display font-bold">{user?.full_name}</h2>
            <Badge variant="outline" className="capitalize">{user?.role}</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{user?.email}</span>
          </div>

          {isExhibitor && profile && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>{profile.company_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>Booth {profile.booth_number}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <span>{profile.event_name}</span>
              </div>
            </>
          )}

          {!isExhibitor && profile && (
            <>
              {profile.job_title && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.job_title}</span>
                </div>
              )}
              {profile.company && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.company}</span>
                </div>
              )}
              {profile.interests?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Interests</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.interests.map(i => (
                      <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full mt-6"
          onClick={() => base44.auth.logout("/login")}
        >
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </Card>
    </div>
  );
}