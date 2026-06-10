import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share2, Copy, Check } from "lucide-react";
import QRGenerator from "@/components/qr/QRGenerator";

export default function QRCodePage() {
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const qrValue = `boothbridge:connect:${user?.id}:${user?.role}`;
  const shareText = `Connect with ${user?.full_name} on Booth Bridge! Code: ${qrValue}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Booth Bridge - Connect with me", text: shareText });
        return;
      } catch {
        // User cancelled or share failed — fall through to dialog
      }
    }
    setShareOpen(true);
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

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share My QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="p-3 bg-white rounded-xl shadow">
              <QRGenerator value={qrValue} size={160} />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Ask the other party to scan this code, or copy your connection code below.
            </p>
            <div className="w-full bg-muted rounded-lg px-3 py-2 font-mono text-xs break-all text-center">
              {qrValue}
            </div>
            <Button className="w-full" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy Connection Code"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}