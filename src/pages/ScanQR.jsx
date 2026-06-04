import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Link2, AlertCircle, Building2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import DigitalBooth from "./DigitalBooth";

export default function ScanQR() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manualId, setManualId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [boothUserId, setBoothUserId] = useState(null); // after scan → show booth directly

  const handleScan = async (code) => {
    setErrorMsg("");
    const parts = code.split(":");
    // Format: boothbridge:connect:userId:role
    if (parts.length === 4 && parts[0] === "boothbridge") {
      const targetId = parts[2];
      const targetRole = parts[3];

      if (targetRole !== "exhibitor") {
        setErrorMsg("This QR code doesn't belong to an exhibitor booth.");
        return;
      }

      // Immediately load digital booth — no approval needed
      setBoothUserId(targetId);

      // Also silently create a connection record for exhibitor's lead tracking
      if (user?.role === "buyer" || user?.user_type === "buyer") {
        const existing = await base44.entities.Connection.filter({
          exhibitor_user_id: targetId,
          buyer_user_id: user.id,
        });
        if (existing.length === 0) {
          const exProfiles = await base44.entities.ExhibitorProfile.filter({ user_id: targetId });
          const exProfile = exProfiles[0];
          await base44.entities.Connection.create({
            exhibitor_user_id: targetId,
            buyer_user_id: user.id,
            status: "accepted", // auto-accepted — no blocking
            initiated_by: "buyer",
            exhibitor_name: exProfile?.digital_card?.name || exProfile?.company_name || "",
            exhibitor_company: exProfile?.company_name || "",
            booth_number: exProfile?.booth_number || "",
            event_name: exProfile?.event_name || "",
            buyer_name: user.full_name,
          });
          await base44.entities.Notification.create({
            user_id: targetId,
            type: "connection_accepted",
            title: "Booth Visit",
            message: `${user.full_name} visited your digital booth.`,
            from_user_name: user.full_name,
          });
        }
      }
    } else {
      setErrorMsg("Invalid code format. Please scan or enter an exhibitor QR code.");
    }
  };

  const handleManualSubmit = () => {
    handleScan(manualId.trim());
  };

  if (boothUserId) {
    return <DigitalBooth exhibitorUserId={boothUserId} onBack={() => setBoothUserId(null)} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold mb-2">Visit a Booth</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Scan an exhibitor's QR code to instantly access their digital booth, catalogs, and products.
      </p>

      <Card className="p-6 text-center mb-6 bg-primary/5 border-primary/20">
        <div className="w-full max-w-xs mx-auto aspect-square bg-white rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-primary/30 mb-4">
          <Camera className="w-16 h-16 text-primary/40 mb-2" />
          <p className="text-sm text-muted-foreground">Camera scanning coming soon</p>
          <p className="text-xs text-muted-foreground mt-1">Use code entry below</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Point your camera at the exhibitor's QR code on their booth or badge
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold">Enter Booth Code</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Booth Code</Label>
            <Input
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleManualSubmit()}
              placeholder="boothbridge:connect:abc123:exhibitor"
              className="font-mono text-sm mt-1"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleManualSubmit}
            disabled={!manualId}
          >
            <Building2 className="w-4 h-4 mr-2" /> Open Digital Booth
          </Button>

          {errorMsg && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}