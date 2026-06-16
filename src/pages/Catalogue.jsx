import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Image, Building2 } from "lucide-react";

export default function Catalogue() {
  const { user } = useAuth();

  const { data: connections = [] } = useQuery({
    queryKey: ["cat-conns", user?.id],
    queryFn: () => db.Connection.filter({ buyer_user_id: user.id, status: "accepted" }),
    enabled: !!user?.id,
  });

  const { data: media = [] } = useQuery({
    queryKey: ["cat-media", user?.id],
    queryFn: () => db.Media.filter({ uploaded_by: user.id }),
    enabled: !!user?.id,
  });

  // Group media by connection
  const grouped = connections.map(conn => ({
    ...conn,
    items: media.filter(m => m.connection_id === conn.id),
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">My Catalogue</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Photos and notes you saved from exhibitor booths
      </p>

      {grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Camera className="w-12 h-12 mx-auto mb-3" />
          <p>No saved items yet</p>
          <p className="text-xs mt-1">Visit connections and save photos from exhibitor booths</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-primary" />
                <h2 className="font-heading font-semibold text-sm">
                  {group.exhibitor_company} · Booth {group.booth_number}
                </h2>
                <Badge variant="outline" className="text-xs">{group.items.length} items</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {group.items.map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    {item.type === "photo" && item.url ? (
                      <img src={item.url} alt={item.caption || "Photo"} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center">
                        <Image className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {(item.caption || item.product_title) && (
                      <div className="p-2">
                        {item.product_title && <p className="text-xs font-semibold truncate">{item.product_title}</p>}
                        {item.caption && <p className="text-xs text-muted-foreground truncate">{item.caption}</p>}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}