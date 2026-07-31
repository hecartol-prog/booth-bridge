import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Nfc, Mail, Phone, Globe, Linkedin, MapPin, MessageCircle,
  UserPlus, Loader2, CheckCircle2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { captureRuntimeError } from "@/monitoring/sentryErrors";
import { useI18n } from "@/lib/i18n";

// Standalone page: /nfc/:userId — opened when someone taps an NFC badge
export default function NFCProfileView() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Extract userId from URL path /nfc/:userId
  const pathParts = window.location.pathname.split("/");
  const targetUserId = pathParts[pathParts.length - 1];

  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId);

  useEffect(() => {
    if (!targetUserId || !isValidUuid) {
      setLoading(false);
      return;
    }
    db.NFCProfile.filter({ user_id: targetUserId })
      .then(list => setProfile(list[0] || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [targetUserId, isValidUuid]);

  // Log NFC interaction
  useEffect(() => {
    if (!profile || !user) return;
    db.NFCInteraction.create({
      initiator_user_id: user.id,
      target_user_id: targetUserId,
      nfc_identifier: profile.nfc_identifier || "",
      interaction_type: "badge_tap",
      timestamp: new Date().toISOString(),
      lead_points: 10,
      synced: true,
    }).catch(() => {});
    // Bump tap count
    db.NFCProfile.update(profile.id, {
      tap_count: (profile.tap_count || 0) + 1,
    }).catch(() => {});
  }, [profile, user]);

  const handleSaveContact = async () => {
    if (!user || !profile || saving) return;
    setSaving(true);
    try {
      await db.Connection.upsert(
        {
          exhibitor_user_id: targetUserId,
          buyer_user_id: user.id,
          status: "accepted",
          initiated_by: "nfc",
          exhibitor_name: profile.display_name || "",
          exhibitor_company: profile.company || "",
          booth_number: profile.booth_number || "",
          event_name: profile.event_name || "",
          buyer_name: user.full_name,
        },
        { onConflict: "exhibitor_user_id,buyer_user_id" }
      );
      setSaved(true);
      toast({
        title: t("nfcProfile.contactSaved"),
        description: t("nfcProfile.contactSavedDescription", { name: profile.display_name || "" }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isDuplicate = /duplicate|unique|already exists/i.test(message);
      if (isDuplicate) {
        toast({ title: t("nfcProfile.alreadySaved"), description: t("nfcProfile.alreadySavedDescription") });
        setSaved(true);
      } else {
        captureRuntimeError(err, {
          subsystem: "PROFILE",
          category: "connection_save_failure",
          component: "NFCProfileView",
        });
        toast({
          title: t("nfcProfile.saveFailed"),
          description: message || t("nfcProfile.saveFailedDescription"),
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <Nfc className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="font-semibold">{t("nfcProfile.profileNotFound")}</p>
        <p className="text-sm text-muted-foreground mt-1">{t("nfcProfile.badgeInactive")}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 flex flex-col items-center">
      <div className="w-full max-w-sm mt-8">
        {/* Profile card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-800 text-white p-6 shadow-xl mb-4">
          <div className="absolute top-3 right-3 opacity-20">
            <Nfc className="w-16 h-16" />
          </div>
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mb-3">
            {(profile.display_name || "?").charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold font-display">{profile.display_name}</h1>
          {profile.position && <p className="text-white/80">{profile.position}</p>}
          {profile.company && <p className="text-white font-semibold">{profile.company}</p>}
          {profile.country && (
            <p className="text-white/70 text-sm mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {profile.country}
              {profile.booth_number && ` · ${t("nfcProfile.booth")} ${profile.booth_number}`}
            </p>
          )}
          <div className="mt-4 pt-4 border-t border-white/20">
            <span className="text-[10px] text-white/40 font-mono">{t("nfcProfile.poweredBy")}</span>
          </div>
        </div>

        {/* Contact info */}
        <Card className="p-4 mb-4 space-y-3">
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              {profile.email}
            </a>
          )}
          {profile.phone && (
            <a href={`tel:${profile.phone}`} className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              {profile.phone}
            </a>
          )}
          {profile.whatsapp && (
            <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-sm hover:text-green-600 transition-colors">
              <MessageCircle className="w-4 h-4 text-green-600 shrink-0" />
              WhatsApp
            </a>
          )}
          {profile.linkedin && (
            <a href={profile.linkedin} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-sm hover:text-blue-600 transition-colors">
              <Linkedin className="w-4 h-4 text-blue-600 shrink-0" />
              LinkedIn
            </a>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              {profile.website}
            </a>
          )}
        </Card>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={handleSaveContact}
            disabled={saved || saving || !user}
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> {t("nfcProfile.contactSavedButton")}</>
            ) : saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("nfcProfile.saving")}</>
            ) : (
              <><UserPlus className="w-4 h-4 mr-2" /> {t("nfcProfile.saveContact")}</>
            )}
          </Button>
          {profile.whatsapp && (
            <Button variant="outline" className="w-full" asChild>
              <a href={`https://wa.me/${profile.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2 text-green-600" /> {t("nfcProfile.sendWhatsApp")}
              </a>
            </Button>
          )}
          {!user && (
            <p className="text-center text-xs text-muted-foreground mt-3">
              <a href="/login" className="text-primary underline">{t("nfcProfile.login")}</a> {t("nfcProfile.loginPrompt")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}