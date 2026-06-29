import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ScanLine, Search, User, Building2, Mail, Phone,
  Trash2, MessageCircle, Calendar, Filter, Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  contacted: "bg-blue-100 text-blue-800 border-blue-200",
  converted: "bg-green-100 text-green-800 border-green-200",
  no_action: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function ScannedContacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["scanned-contacts", user?.id],
    queryFn: () => db.ScannedContact.filter({ scanned_by_user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.ScannedContact.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scanned-contacts", user?.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.ScannedContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scanned-contacts", user?.id] });
      toast({ title: "Contact deleted" });
    },
  });

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || [c.full_name, c.company, c.email, c.position].some(v => v?.toLowerCase().includes(q));
    const matchType = typeFilter === "all" || c.scan_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold">Scanned Contacts</h1>
            <p className="text-xs text-muted-foreground">{contacts.length} contacts captured</p>
          </div>
        </div>
        <Link to="/ocr-scanner">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" /> Scan
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["all", "business_card", "badge"].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {t === "all" ? "All" : t === "business_card" ? "Cards" : "Badges"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <ScanLine className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
          <p className="font-semibold text-sm">No contacts yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Scan a business card or badge to get started.</p>
          <Link to="/ocr-scanner">
            <Button size="sm"><ScanLine className="w-4 h-4 mr-2" /> Scan Now</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(contact => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{contact.full_name || "Unknown"}</p>
                        <Badge className={`text-[10px] border ${STATUS_COLORS[contact.follow_up_status] || STATUS_COLORS.pending}`}>
                          {contact.follow_up_status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {contact.scan_type === "business_card" ? "🪪 Card" : "🏷️ Badge"}
                        </Badge>
                      </div>
                      {contact.position && <p className="text-xs text-muted-foreground">{contact.position}</p>}
                      {contact.company && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {contact.company}
                        </p>
                      )}
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                            <Mail className="w-3 h-3" /> {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary">
                            <Phone className="w-3 h-3" /> {contact.phone}
                          </a>
                        )}
                      </div>
                      {contact.ocr_confidence > 0 && (
                        <p className={`text-[10px] mt-1 ${contact.ocr_confidence >= 80 ? "text-green-600" : contact.ocr_confidence >= 60 ? "text-amber-600" : "text-red-600"}`}>
                          OCR {contact.ocr_confidence}% confidence
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <select
                      value={contact.follow_up_status}
                      onChange={e => updateMutation.mutate({ id: contact.id, data: { follow_up_status: e.target.value } })}
                      className="text-xs border rounded px-1.5 py-1 bg-background"
                    >
                      <option value="pending">Pending</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="no_action">No Action</option>
                    </select>
                    <button
                      onClick={() => deleteMutation.mutate(contact.id)}
                      className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors self-end"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}