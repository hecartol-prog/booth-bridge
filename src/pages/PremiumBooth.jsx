import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { db } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Star, Crown, Upload, Users, Award, BarChart3,
  Eye, QrCode, Bookmark, FileText, Calendar, ArrowLeft, Loader2, Plus, Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const CERT_OPTIONS = ["ISO 9001", "ISO 14001", "BSCI", "Sedex", "FDA", "CE", "RoHS", "OEKO-TEX", "FSC", "SA8000"];

export default function PremiumBooth() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSection, setEditingSection] = useState(null);
  const [teamMemberForm, setTeamMemberForm] = useState({ name: "", title: "", email: "", whatsapp: "", linkedin: "" });
  const [showAddTeam, setShowAddTeam] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["premium-profile", user?.id],
    queryFn: async () => {
      const p = await base44.entities.ExhibitorProfile.filter({ user_id: user.id });
      return p[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
    queryKey: ["premium-sub", user?.id],
    queryFn: async () => {
      const subs = await base44.entities.PremiumBoothSubscription.filter({ exhibitor_id: user.id });
      return subs[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["pb-connections", user?.id],
    queryFn: () => base44.entities.Connection.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });
  const { data: rfis = [] } = useQuery({
    queryKey: ["pb-rfis", user?.id],
    queryFn: () => base44.entities.RFI.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });
  const { data: meetings = [] } = useQuery({
    queryKey: ["pb-meetings", user?.id],
    queryFn: () => base44.entities.Meeting.filter({ proposed_to: user.id }),
    enabled: !!user?.id,
  });
  const { data: catalogs = [] } = useQuery({
    queryKey: ["pb-catalogs", user?.id],
    queryFn: () => base44.entities.CatalogItem.filter({ exhibitor_user_id: user.id }),
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: (data) => base44.entities.ExhibitorProfile.update(profile.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["premium-profile", user?.id] });
      setEditingSection(null);
      toast({ title: "Profile updated!" });
    },
  });

  const isPremium = subscription?.status === "active" && subscription?.plan_type === "premium";

  const boothStats = [
    { label: "Profile Views", value: connections.length, icon: Eye, color: "text-primary" },
    { label: "QR Scans", value: connections.filter(c => c.scan_type === "qr").length, icon: QrCode, color: "text-blue-500" },
    { label: "Saves", value: connections.filter(c => c.status === "accepted").length, icon: Bookmark, color: "text-green-500" },
    { label: "RFIs", value: rfis.length, icon: FileText, color: "text-amber-500" },
    { label: "Meetings", value: meetings.length, icon: Calendar, color: "text-purple-500" },
    { label: "Downloads", value: catalogs.reduce((s, c) => s + (c.download_count || 0), 0), icon: BarChart3, color: "text-teal-500" },
  ];

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Set up your exhibitor profile first.</p>
        <Link to="/profile"><Button size="sm" className="mt-3">Go to Profile</Button></Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" /> Premium Booth
          </h1>
          <p className="text-sm text-muted-foreground">Manage your premium exhibitor presence</p>
        </div>
        {isPremium ? (
          <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-300">✨ Premium Active</Badge>
        ) : (
          <Button size="sm" className="ml-auto bg-amber-500 hover:bg-amber-600" onClick={() => toast({ title: "Premium upgrade coming soon!", description: "Contact us at hello@boothbridge.com" })}>
            <Crown className="w-4 h-4 mr-1.5" /> Upgrade to Premium
          </Button>
        )}
      </div>

      {/* Booth Stats — only visible to exhibitor */}
      <Card className="mb-5 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Your Booth Statistics
            <Badge variant="outline" className="text-[10px] ml-auto">Only you can see this</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {boothStats.map(s => (
              <div key={s.label} className="text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Story */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Company Story</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setEditingSection(editingSection === "story" ? null : "story")}>
              {editingSection === "story" ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingSection === "story" ? (
            <StoryEditor profile={profile} onSave={(data) => updateProfile.mutate(data)} saving={updateProfile.isPending} />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {profile.description || "Add a company story to engage buyers..."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Certifications</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setEditingSection(editingSection === "certs" ? null : "certs")}>
              {editingSection === "certs" ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {editingSection === "certs" ? (
            <CertEditor profile={profile} onSave={(data) => updateProfile.mutate(data)} saving={updateProfile.isPending} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(profile.certifications || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No certifications added yet.</p>
              ) : (
                profile.certifications.map(c => (
                  <Badge key={c} className="bg-amber-50 text-amber-700 border-amber-200">{c}</Badge>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members — Premium feature */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Team Members
              {!isPremium && <Badge className="text-[10px] bg-amber-100 text-amber-700">Premium</Badge>}
            </CardTitle>
            {isPremium && (
              <Button size="sm" variant="ghost" onClick={() => setShowAddTeam(!showAddTeam)}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isPremium ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Upgrade to Premium to showcase your team.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => toast({ title: "Upgrade to unlock team members!" })}>
                <Crown className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Upgrade
              </Button>
            </div>
          ) : (
            <>
              {showAddTeam && (
                <div className="border rounded-lg p-3 mb-3 space-y-2">
                  {["name", "title", "email", "whatsapp", "linkedin"].map(field => (
                    <Input
                      key={field}
                      placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                      value={teamMemberForm[field]}
                      onChange={e => setTeamMemberForm(f => ({ ...f, [field]: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  ))}
                  <Button size="sm" className="w-full" onClick={() => {
                    const existing = profile.team_members || [];
                    const newMember = JSON.stringify(teamMemberForm);
                    updateProfile.mutate({ team_members: [...existing, newMember] });
                    setTeamMemberForm({ name: "", title: "", email: "", whatsapp: "", linkedin: "" });
                    setShowAddTeam(false);
                  }}>Add Team Member</Button>
                </div>
              )}
              {(profile.team_members || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No team members added yet.</p>
              ) : (
                <div className="space-y-2">
                  {profile.team_members.map((m, i) => {
                    let member;
                    try { member = typeof m === "string" ? JSON.parse(m) : m; } catch { member = { name: m }; }
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{(member.name || "?")[0]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.title} {member.email && `· ${member.email}`}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="w-6 h-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => {
                          const updated = (profile.team_members || []).filter((_, idx) => idx !== i);
                          updateProfile.mutate({ team_members: updated });
                        }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/catalogue"><Button variant="outline" className="w-full"><FileText className="w-4 h-4 mr-2" /> Manage Catalogs</Button></Link>
        <Link to="/products"><Button variant="outline" className="w-full"><Star className="w-4 h-4 mr-2" /> Manage Products</Button></Link>
      </div>
    </div>
  );
}

function StoryEditor({ profile, onSave, saving }) {
  const [desc, setDesc] = useState(profile.description || "");
  return (
    <div className="space-y-2">
      <Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={5} placeholder="Tell your company story..." />
      <Button size="sm" onClick={() => onSave({ description: desc })} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
      </Button>
    </div>
  );
}

function CertEditor({ profile, onSave, saving }) {
  const [selected, setSelected] = useState(profile.certifications || []);
  const toggle = (c) => setSelected(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CERT_OPTIONS.map(c => (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${selected.includes(c) ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-card border-border hover:border-primary/50"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <Button size="sm" onClick={() => onSave({ certifications: selected })} disabled={saving}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save Certifications
      </Button>
    </div>
  );
}