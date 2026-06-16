import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Edit2, Save, Globe, Mail, Phone, Link2, Building2 } from "lucide-react";

export default function BusinessCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [card, setCard] = useState({
    name: "", title: "", email: "", phone: "", website: "", linkedin: ""
  });

  const isExhibitor = user?.user_role === "exhibitor";

  const { data: profile } = useQuery({
    queryKey: ["card-profile", user?.id, user?.role],
    queryFn: async () => {
      if (isExhibitor) {
        const profiles = await db.ExhibitorProfile.filter({ user_id: user.id });
        return profiles[0];
      } else {
        const profiles = await db.BuyerProfile.filter({ user_id: user.id });
        return profiles[0];
      }
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile?.digital_card) {
      setCard(profile.digital_card);
    } else if (user) {
      setCard(prev => ({
        ...prev,
        name: user.full_name || "",
        email: user.email || "",
      }));
    }
  }, [profile, user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isExhibitor) {
        await db.ExhibitorProfile.update(profile.id, { digital_card: card });
      } else {
        await db.BuyerProfile.update(profile.id, { digital_card: card });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-profile"] });
      setEditing(false);
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">My Business Card</h1>
        <Button size="sm" variant="outline" onClick={() => editing ? saveMutation.mutate() : setEditing(true)}>
          {editing ? <><Save className="w-4 h-4 mr-1" /> Save</> : <><Edit2 className="w-4 h-4 mr-1" /> Edit</>}
        </Button>
      </div>

      {/* Card Preview */}
      <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 via-card to-accent/5 border-2">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-display font-bold">{card.name || "Your Name"}</h2>
            <p className="text-sm text-muted-foreground">{card.title || "Job Title"}</p>
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {card.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" /> {card.email}
            </div>
          )}
          {card.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" /> {card.phone}
            </div>
          )}
          {card.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" /> {card.website}
            </div>
          )}
          {card.linkedin && (
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="w-4 h-4 text-muted-foreground" /> {card.linkedin}
            </div>
          )}
        </div>
      </Card>

      {/* Edit form */}
      {editing && (
        <Card className="p-4 space-y-3">
          <div>
            <Label>Full Name</Label>
            <Input value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={card.title} onChange={e => setCard({ ...card, title: e.target.value })} placeholder="CEO / Procurement Manager" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={card.email} onChange={e => setCard({ ...card, email: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={card.phone} onChange={e => setCard({ ...card, phone: e.target.value })} placeholder="+1 234 567 890" />
          </div>
          <div>
            <Label>Website</Label>
            <Input value={card.website} onChange={e => setCard({ ...card, website: e.target.value })} placeholder="https://company.com" />
          </div>
          <div>
            <Label>LinkedIn</Label>
            <Input value={card.linkedin} onChange={e => setCard({ ...card, linkedin: e.target.value })} placeholder="linkedin.com/in/name" />
          </div>
        </Card>
      )}
    </div>
  );
}