import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";
import QRGenerator from "@/components/qr/QRGenerator";

export default function QRCodePage() {
  const { user } = useAuth();
  
  const qrValue = `boothbridge:connect:${user?.id}:${user?.role}`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Booth Bridge - Connect with me",
        text: `Scan my QR code to connect! ID: ${user?.id}`,
      });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">My QR Code</h1>
      
      <Card className="p-8 text-center">
        <div className="inline-block p-4 bg-white rounded-2xl shadow-lg animate-pulse-glow">
          <QRGenerator value={qrValue} size={220} />
        </div>
        
        <div className="mt-6">
          <p className="font-heading font-semibold text-lg">{user?.full_name}</p>
          <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 px-4">
          Show this QR code to {user?.role === "exhibitor" ? "buyers" : "exhibitors"} to connect. Both parties must approve the connection.
        </p>

        <div className="flex gap-3 mt-6 justify-center">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>
      </Card>
    </div>
  );
}