import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Nfc, Search, Activity, BarChart2, Power, PowerOff,
  Tag, CheckCircle2, Zap, Download, RefreshCw
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function NFCOrganizerPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("profiles");
  const [search, setSearch] = useState("");
  const [newNfcId, setNewNfcId] = useState("");

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["all-nfc-profiles"],
    queryFn: () => db.NFCProfile.list("-created_date", 100),
    enabled: user?.role === "admin",
  });

  const { data: productTags = [] } = useQuery({
    queryKey: ["nfc-product-tags"],
    queryFn: () => db.NFCProductTag.list("-created_date", 100),
    enabled: user?.role === "admin",
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["all-nfc-interactions"],
    queryFn: () => db.NFCInteraction.list("-created_date", 200),
    enabled: user?.role === "admin",
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => db.NFCProfile.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-nfc-profiles"] });
      toast({ title: "NFC profile updated" });
    },
  });

  const toggleTagMutation = useMutation({
    mutationFn: ({ id, active_status }) => db.NFCProductTag.update(id, { active_status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nfc-product-tags"] }),
  });

  const generateNFCId = () => {
    const id = `BB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    setNewNfcId(id);
  };

  const copyId = () => {
    navigator.clipboard.writeText(newNfcId);
    toast({ title: "NFC ID copied!" });
  };

  if (user?.role !== "admin") {
    return <div className="p-6 text-center text-muted-foreground">Access restricted to administrators.</div>;
  }

  const filteredProfiles = profiles.filter(p =>
    !search || [p.display_name, p.company, p.nfc_identifier].some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalTaps = profiles.reduce((s, p) => s + (p.tap_count || 0), 0);
  const activeBadges = profiles.filter(p => p.active).length;

  const tabs = [
    { id: "profiles", label: "Badges", icon: Nfc },
    { id: "product_tags", label: "Product Tags", icon: Tag },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "generate", label: "Generate IDs", icon: Zap },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Nfc className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">NFC Management</h1>
          <p className="text-xs text-muted-foreground">Organizer NFC badge and tag control center</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Badges", value: profiles.length, icon: Nfc, color: "text-primary" },
          { label: "Active", value: activeBadges, icon: CheckCircle2, color: "text-green-600" },
          { label: "Total Taps", value: totalTaps, icon: Activity, color: "text-blue-600" },
          { label: "Product Tags", value: productTags.length, icon: Tag, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-xl font-display font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-5 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              tab === t.id ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* BADGE PROFILES */}
      {tab === "profiles" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search badges..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filteredProfiles.length === 0 ? (
            <Card className="p-8 text-center">
              <Nfc className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No NFC badges yet</p>
            </Card>
          ) : (
            filteredProfiles.map(p => (
              <Card key={p.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${p.active ? "bg-green-100" : "bg-gray-100"}`}>
                      <Nfc className={`w-4 h-4 ${p.active ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.display_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{p.company}{p.booth_number && ` · Booth ${p.booth_number}`}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{p.nfc_identifier}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{p.tap_count || 0} taps</Badge>
                    <button
                      onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}
                      className={`p-1.5 rounded-lg transition-colors ${p.active ? "bg-green-100 hover:bg-red-100" : "bg-gray-100 hover:bg-green-100"}`}
                    >
                      {p.active ? <Power className="w-4 h-4 text-green-600" /> : <PowerOff className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* PRODUCT TAGS */}
      {tab === "product_tags" && (
        <div className="space-y-3">
          {productTags.length === 0 ? (
            <Card className="p-8 text-center">
              <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No product NFC tags</p>
              <p className="text-xs text-muted-foreground mt-1">Tags are created by exhibitors from their product pages.</p>
            </Card>
          ) : (
            productTags.map(tag => (
              <Card key={tag.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{tag.tag_label || tag.tag_code}</p>
                    <p className="text-xs text-muted-foreground font-mono">{tag.tag_code}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">{tag.tap_count || 0} taps</span>
                      <span className="text-xs text-muted-foreground">{tag.save_count || 0} saves</span>
                      <span className="text-xs text-muted-foreground">{tag.quote_request_count || 0} quotes</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleTagMutation.mutate({ id: tag.id, active_status: !tag.active_status })}
                    className={`p-1.5 rounded-lg ${tag.active_status ? "bg-green-100" : "bg-gray-100"}`}
                  >
                    {tag.active_status ? <Power className="w-4 h-4 text-green-600" /> : <PowerOff className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ANALYTICS */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Badge Taps (All Time)", value: totalTaps },
              { label: "Active Badges", value: activeBadges },
              { label: "Total Interactions", value: interactions.length },
              { label: "Inactive Badges", value: profiles.length - activeBadges },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className="text-2xl font-display font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Badges by Taps</CardTitle></CardHeader>
            <CardContent>
              {[...profiles].sort((a, b) => (b.tap_count || 0) - (a.tap_count || 0)).slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.display_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{p.company}</p>
                  </div>
                  <Badge variant="outline">{p.tap_count || 0} taps</Badge>
                </div>
              ))}
              {profiles.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No data yet.</p>}
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" /> Export NFC Report (CSV)
          </Button>
        </div>
      )}

      {/* GENERATE IDs */}
      {tab === "generate" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Generate NFC Badge ID</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Generate unique NFC identifiers to program into physical NFC badges.
            </p>
            <Button onClick={generateNFCId} className="w-full mb-3">
              <RefreshCw className="w-4 h-4 mr-2" /> Generate New ID
            </Button>
            {newNfcId && (
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between gap-2">
                <code className="text-sm font-mono flex-1 break-all">{newNfcId}</code>
                <Button size="sm" variant="outline" onClick={copyId}>Copy</Button>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-3">NFC Programming Guide</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              {[
                "Generate a unique NFC ID above",
                `Assign the NFC ID to the attendee's profile URL: /nfc/[userId]`,
                "Program the URL into an NFC sticker or card using an NFC writer app",
                "Attach the NFC badge to the exhibitor's lanyard or booth",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}