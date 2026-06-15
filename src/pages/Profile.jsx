import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/authClient";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Building2, MapPin, Briefcase, LogOut, Edit2, Save, X, Plus } from "lucide-react";

const INTEREST_OPTIONS = [
  "Electronics", "Textiles", "Machinery", "Food & Beverage", "Chemicals",
  "Automotive", "Medical Devices", "Consumer Goods", "Industrial Equipment",
  "Packaging", "Software", "Logistics", "Agriculture", "Energy", "Construction"
];

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isExhibitor = user?.user_role === "exhibitor";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [newInterest, setNewInterest] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-data", user?.id, user?.user_role],
    queryFn: async () => {
      if (isExhibitor) {
        const profiles = await db.ExhibitorProfile.filter({ user_id: user.id });
        return profiles[0] || null;
      } else {
        const profiles = await db.BuyerProfile.filter({ user_id: user.id });
        return profiles[0] || null;
      }
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setForm(profile);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isExhibitor) {
        await db.ExhibitorProfile.update(profile.id, form);
      } else {
        await db.BuyerProfile.update(profile.id, form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-data"] });
      setEditing(false);
    },
  });

  const toggleInterest = (interest) => {
    const current = form.interests || [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    setForm(prev => ({ ...prev, interests: updated }));
  };

  const addCustomInterest = () => {
    const trimmed = newInterest.trim();
    if (!trimmed) return;
    const current = form.interests || [];
    if (!current.includes(trimmed)) {
      setForm(prev => ({ ...prev, interests: [...current, trimmed] }));
    }
    setNewInterest("");
  };

  const cancelEdit = () => {
    setForm(profile || {});
    setEditing(false);
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Profile</h1>
        {profile && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" /> Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      <Card className="p-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
            {isExhibitor && (form.logo_url || profile?.logo_url) ? (
              <img src={form.logo_url || profile?.logo_url} className="w-16 h-16 rounded-2xl object-cover" alt="Logo" />
            ) : (
              <User className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-display font-bold">{user?.full_name}</h2>
            <Badge variant="outline" className="capitalize">{user?.user_role}</Badge>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email — always read-only */}
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{user?.email}</span>
          </div>

          {/* ---- EXHIBITOR FIELDS ---- */}
          {isExhibitor && (
            <>
              <FieldRow icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                label="Company" editing={editing}
                value={form.company_name || ""}
                onChange={v => setForm(p => ({ ...p, company_name: v }))}
                placeholder="Company name" />

              <FieldRow icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                label="Booth Number" editing={editing}
                value={form.booth_number || ""}
                onChange={v => setForm(p => ({ ...p, booth_number: v }))}
                placeholder="e.g. A12" />

              <FieldRow icon={<Briefcase className="w-4 h-4 text-muted-foreground" />}
                label="Event" editing={editing}
                value={form.event_name || ""}
                onChange={v => setForm(p => ({ ...p, event_name: v }))}
                placeholder="Event name" />

              {editing && (
                <FieldRow icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                  label="Country" editing={editing}
                  value={form.country || ""}
                  onChange={v => setForm(p => ({ ...p, country: v }))}
                  placeholder="Country" />
              )}
              {!editing && form.country && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{form.country}</span>
                </div>
              )}
            </>
          )}

          {/* ---- BUYER FIELDS ---- */}
          {!isExhibitor && (
            <>
              <FieldRow icon={<Briefcase className="w-4 h-4 text-muted-foreground" />}
                label="Job Title" editing={editing}
                value={form.job_title || ""}
                onChange={v => setForm(p => ({ ...p, job_title: v }))}
                placeholder="e.g. Procurement Manager" />

              <FieldRow icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                label="Company" editing={editing}
                value={form.company || ""}
                onChange={v => setForm(p => ({ ...p, company: v }))}
                placeholder="Company name" />

              {editing && (
                <FieldRow icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                  label="Country" editing={editing}
                  value={form.country || ""}
                  onChange={v => setForm(p => ({ ...p, country: v }))}
                  placeholder="Country" />
              )}
              {!editing && form.country && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{form.country}</span>
                </div>
              )}

              {/* Interests */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Interests</p>
                {editing ? (
                  <>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {INTEREST_OPTIONS.map(opt => {
                        const selected = (form.interests || []).includes(opt);
                        return (
                          <button key={opt} onClick={() => toggleInterest(opt)}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${selected ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Add custom interest…" value={newInterest}
                        onChange={e => setNewInterest(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addCustomInterest()}
                        className="h-8 text-sm" />
                      <Button size="sm" variant="outline" onClick={addCustomInterest}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    {(form.interests || []).filter(i => !INTEREST_OPTIONS.includes(i)).map(i => (
                      <Badge key={i} variant="outline" className="text-xs mt-1 mr-1">
                        {i}
                        <button onClick={() => toggleInterest(i)} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(form.interests || []).length > 0
                      ? (form.interests || []).map(i => <Badge key={i} variant="outline" className="text-xs">{i}</Badge>)
                      : <span className="text-xs text-muted-foreground italic">No interests set</span>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <Button variant="outline" className="w-full mt-6" onClick={() => auth.logout("/login")}>
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </Card>
    </div>
  );
}

function FieldRow({ icon, label, editing, value, onChange, placeholder }) {
  if (!editing) {
    if (!value) return null;
    return (
      <div className="flex items-center gap-3 text-sm">
        {icon}
        <span>{value}</span>
      </div>
    );
  }
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <span className="shrink-0">{icon}</span>
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-sm" />
      </div>
    </div>
  );
}