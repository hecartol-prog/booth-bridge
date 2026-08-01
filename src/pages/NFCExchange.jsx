import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Nfc, Smartphone, Users, Activity, Edit, Copy, CheckCircle2,
  Zap, BarChart2, WifiOff
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import NFCProfileCard from "@/components/nfc/NFCProfileCard";

export default function NFCExchange() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("my_profile");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const { data: nfcProfile, isLoading } = useQuery({
    queryKey: ["nfc-profile", user?.id],
    queryFn: async () => {
      const list = await db.NFCProfile.filter({ user_id: user.id });
      return list[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["nfc-interactions", user?.id],
    queryFn: () => db.NFCInteraction.filter({ target_user_id: user.id }, "-created_date", 20),
    enabled: !!user?.id,
  });

  const [form, setForm] = useState({
    display_name: "", company: "", position: "", email: "",
    phone: "", whatsapp: "", linkedin: "", website: "",
    booth_number: "", country: "",
  });

  useEffect(() => {
    if (nfcProfile) {
      setForm({
        display_name: nfcProfile.display_name || user?.full_name || "",
        company: nfcProfile.company || "",
        position: nfcProfile.position || "",
        email: nfcProfile.email || user?.email || "",
        phone: nfcProfile.phone || "",
        whatsapp: nfcProfile.whatsapp || "",
        linkedin: nfcProfile.linkedin || "",
        website: nfcProfile.website || "",
        booth_number: nfcProfile.booth_number || "",
        country: nfcProfile.country || "",
      });
    } else if (user) {
      setForm(f => ({ ...f, display_name: user?.full_name || "", email: user.email || "" }));
    }
  }, [nfcProfile, user]);

  const saveMutation = useMutation({
    mutationFn: async (/** @type {any} */ data) => {
      if (nfcProfile) {
        return db.NFCProfile.update(nfcProfile.id, data);
      } else {
        const nfcId = `bb-nfc-${user.id}-${Date.now()}`;
        return db.NFCProfile.create({
          ...data,
          user_id: user.id,
          nfc_identifier: nfcId,
          profile_url: `${window.location.origin}/nfc/${user.id}`,
          active: true,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfc-profile", user?.id] });
      setEditing(false);
      toast({ title: "NFC Profile saved!" });
    },
  });

  const profileUrl = nfcProfile?.profile_url || `${window.location.origin}/nfc/${user?.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "my_profile", label: "My NFC Profile", icon: Nfc },
    { id: "interactions", label: "Tap History", icon: Activity },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
  ];

  const todayTaps = interactions.filter(i => {
    const d = new Date(i.created_date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
          <WifiOff className="w-4 h-4 shrink-0" /> Offline — NFC interactions will sync when reconnected.
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Nfc className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">NFC Badge Exchange</h1>
          <p className="text-xs text-muted-foreground">Tap badges, exchange contacts instantly</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-5">
        {tabs.map(tab_ => (
          <button
            key={tab_.id}
            onClick={() => setTab(tab_.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-colors ${
              tab === tab_.id ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab_.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab_.label}</span>
          </button>
        ))}
      </div>

      {/* MY PROFILE TAB */}
      {tab === "my_profile" && (
        <div className="space-y-4">
          {/* NFC ID Card Preview */}
          <NFCProfileCard profile={nfcProfile} user={user} />

          {/* Profile URL */}
          <Card>
            <CardContent className="p-4">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">Your NFC Profile URL</Label>
              <div className="flex gap-2">
                <Input value={profileUrl} readOnly className="text-xs font-mono" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Program this URL into your NFC badge for instant contact sharing.
              </p>
            </CardContent>
          </Card>

          {/* Edit Form */}
          {editing ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Edit NFC Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "display_name", label: "Full Name" },
                  { key: "company", label: "Company" },
                  { key: "position", label: "Position" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "whatsapp", label: "WhatsApp" },
                  { key: "linkedin", label: "LinkedIn URL" },
                  { key: "website", label: "Website" },
                  { key: "booth_number", label: "Booth Number" },
                  { key: "country", label: "Country" },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input
                      className="mt-1"
                      value={form[f.key]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="flex-1">
                    {saveMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setEditing(true)} variant="outline" className="w-full">
              <Edit className="w-4 h-4 mr-2" /> {nfcProfile ? "Edit Profile" : "Create NFC Profile"}
            </Button>
          )}
        </div>
      )}

      {/* INTERACTIONS TAB */}
      {tab === "interactions" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Total Taps", value: nfcProfile?.tap_count || 0, icon: Zap, color: "text-primary" },
              { label: "Today", value: todayTaps.length, icon: Smartphone, color: "text-green-600" },
              { label: "Contacts", value: interactions.length, icon: Users, color: "text-purple-600" },
            ].map(stat => (
              <Card key={stat.label} className="p-3 text-center">
                <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                <p className="text-xl font-bold font-display">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </Card>
            ))}
          </div>

          {interactions.length === 0 ? (
            <Card className="p-8 text-center">
              <Nfc className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No NFC taps yet</p>
              <p className="text-xs text-muted-foreground mt-1">When someone taps your badge, they'll appear here.</p>
            </Card>
          ) : (
            interactions.map(interaction => (
              <Card key={interaction.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Nfc className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {interaction.interaction_type === "badge_tap" ? "Badge Tap" :
                         interaction.interaction_type === "product_tap" ? "Product Tap" : "Booth Tap"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(interaction.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-700 border-green-300 text-xs">
                    +{interaction.lead_points} pts
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Taps", value: nfcProfile?.tap_count || 0 },
              { label: "Interactions", value: interactions.length },
              { label: "Today's Taps", value: todayTaps.length },
              { label: "Lead Points", value: interactions.reduce((s, i) => s + (i.lead_points || 10), 0) },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">NFC Activity Timeline</h3>
            {interactions.slice(0, 10).map((i, idx) => (
              <div key={i.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <p className="text-xs text-muted-foreground flex-1">
                  {i.interaction_type?.replace("_", " ")} · {new Date(i.created_date).toLocaleDateString()}
                </p>
                <span className="text-xs text-green-600 font-medium">+{i.lead_points} pts</span>
              </div>
            ))}
            {interactions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No activity yet.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}