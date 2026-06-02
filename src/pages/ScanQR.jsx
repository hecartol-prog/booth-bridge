import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ScanQR() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [manualId, setManualId] = useState("");
  const [status, setStatus] = useState(null); // null | "sending" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  const handleConnect = async (targetId, targetRole) => {
    if (!targetId) return;
    setStatus("sending");
    setErrorMsg("");

    // Determine which is exhibitor and which is buyer
    let exhibitorUserId, buyerUserId;
    if (user.role === "buyer" && targetRole === "exhibitor") {
      exhibitorUserId = targetId;
      buyerUserId = user.id;
    } else if (user.role === "exhibitor" && targetRole === "buyer") {
      exhibitorUserId = user.id;
      buyerUserId = targetId;
    } else {
      setStatus("error");
      setErrorMsg("You can only connect with the opposite role (exhibitor ↔ buyer).");
      return;
    }

    // Check for existing connection
    const existing = await base44.entities.Connection.filter({
      exhibitor_user_id: exhibitorUserId,
      buyer_user_id: buyerUserId,
    });

    if (existing.length > 0) {
      setStatus("error");
      setErrorMsg("Connection already exists with this user.");
      return;
    }

    // Get profiles for display names
    let exhibitorName = "", buyerName = "", exhibitorCompany = "", buyerCompany = "", boothNum = "", evtName = "";
    
    if (user.role === "buyer") {
      const exProfiles = await base44.entities.ExhibitorProfile.filter({ user_id: targetId });
      const buyProfiles = await base44.entities.BuyerProfile.filter({ user_id: user.id });
      if (exProfiles.length) {
        exhibitorName = exProfiles[0].digital_card?.name || exProfiles[0].company_name;
        exhibitorCompany = exProfiles[0].company_name;
        boothNum = exProfiles[0].booth_number;
        evtName = exProfiles[0].event_name;
      }
      buyerName = user.full_name;
      buyerCompany = buyProfiles[0]?.company || "";
    } else {
      const buyProfiles = await base44.entities.BuyerProfile.filter({ user_id: targetId });
      const exProfiles = await base44.entities.ExhibitorProfile.filter({ user_id: user.id });
      if (buyProfiles.length) {
        buyerName = buyProfiles[0].digital_card?.name || "";
        buyerCompany = buyProfiles[0].company || "";
      }
      exhibitorName = user.full_name;
      if (exProfiles.length) {
        exhibitorCompany = exProfiles[0].company_name;
        boothNum = exProfiles[0].booth_number;
        evtName = exProfiles[0].event_name;
      }
    }

    await base44.entities.Connection.create({
      exhibitor_user_id: exhibitorUserId,
      buyer_user_id: buyerUserId,
      status: "pending",
      initiated_by: user.role,
      exhibitor_name: exhibitorName,
      buyer_name: buyerName,
      exhibitor_company: exhibitorCompany,
      buyer_company: buyerCompany,
      booth_number: boothNum,
      event_name: evtName,
    });

    // Create notification for the other party
    const notifUserId = user.role === "buyer" ? exhibitorUserId : buyerUserId;
    await base44.entities.Notification.create({
      user_id: notifUserId,
      type: "connection_request",
      title: "New Connection Request",
      message: `${user.full_name} wants to connect with you.`,
      from_user_name: user.full_name,
    });

    setStatus("success");
    toast({ title: "Connection request sent!", description: "Waiting for approval." });
  };

  const handleManualSubmit = () => {
    // Parse boothbridge:connect:userId:role format or just use as ID
    const parts = manualId.split(":");
    if (parts.length === 4 && parts[0] === "boothbridge") {
      handleConnect(parts[2], parts[3]);
    } else {
      setErrorMsg("Invalid code format. Please use the QR code from the other user.");
      setStatus("error");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">Scan & Connect</h1>

      <Card className="p-6 text-center mb-6">
        <div className="w-full aspect-square max-w-xs mx-auto bg-muted rounded-xl flex items-center justify-center mb-4">
          <div className="text-center">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Camera scanning coming soon</p>
            <p className="text-xs text-muted-foreground mt-1">Use manual entry below</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-semibold">Enter Code Manually</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label>Connection Code</Label>
            <Input
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              placeholder="boothbridge:connect:abc123:exhibitor"
              className="font-mono text-sm"
            />
          </div>
          <Button
            className="w-full"
            onClick={handleManualSubmit}
            disabled={!manualId || status === "sending"}
          >
            {status === "sending" ? "Connecting..." : "Send Connection Request"}
          </Button>

          {status === "success" && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              Connection request sent! Waiting for approval.
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}