import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Phone, Package, DollarSign, Clock, CheckCircle2, Plus } from "lucide-react";
import { format } from "date-fns";

const typeIcons = { brochure: FileText, sample: Package, price_list: DollarSign, call_me: Phone };
const typeLabels = { brochure: "Brochure", sample: "Sample", price_list: "Price List", call_me: "Call Me" };

export default function MyRFIs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newRFI, setNewRFI] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [requestType, setRequestType] = useState("brochure");
  const [message, setMessage] = useState("");

  const { data: rfis = [], isLoading } = useQuery({
    queryKey: ["my-rfis", user?.id],
    queryFn: () => db.RFI.filter({ buyer_user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["buyer-conns-rfi", user?.id],
    queryFn: () => db.Connection.filter({ buyer_user_id: user.id, status: "accepted" }),
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const conn = connections.find(c => c.id === selectedConnection);
      if (!conn) return;
      const rfi = await db.RFI.create({
        connection_id: selectedConnection,
        buyer_user_id: user.id,
        exhibitor_user_id: conn.exhibitor_user_id,
        request_type: requestType,
        message,
        status: "pending",
        buyer_name: user.full_name,
        buyer_company: conn.buyer_company,
        exhibitor_company: conn.exhibitor_company,
      });
      await db.Notification.create({
        user_id: conn.exhibitor_user_id,
        type: "rfi_received",
        title: "New RFI Request",
        message: `${user.full_name} requested: ${typeLabels[requestType]}`,
        from_user_name: user.full_name,
        related_id: rfi.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-rfis"] });
      setNewRFI(false);
      setMessage("");
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">My RFIs</h1>
        <Button size="sm" onClick={() => setNewRFI(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : rfis.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3" />
          <p>No information requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rfis.map(rfi => {
            const Icon = typeIcons[rfi.request_type] || FileText;
            return (
              <Card key={rfi.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    rfi.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{typeLabels[rfi.request_type]}</p>
                      <Badge variant={rfi.status === "pending" ? "outline" : "default"} className="text-xs">
                        {rfi.status === "pending" ? <><Clock className="w-3 h-3 mr-1" /> Pending</> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Replied</>}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">To: {rfi.exhibitor_company}</p>
                    {rfi.message && <p className="text-sm mt-2 bg-muted p-2 rounded">{rfi.message}</p>}
                    {rfi.reply && (
                      <p className="text-sm mt-2 bg-primary/5 p-2 rounded border-l-2 border-primary">
                        <span className="text-xs font-medium text-primary">Reply:</span><br />{rfi.reply}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(rfi.created_date), "MMM d, h:mm a")}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={newRFI} onOpenChange={setNewRFI}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Exhibitor</Label>
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger><SelectValue placeholder="Select exhibitor" /></SelectTrigger>
                <SelectContent>
                  {connections.map(conn => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.exhibitor_company} · Booth {conn.booth_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Request Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brochure">Brochure</SelectItem>
                  <SelectItem value="sample">Sample</SelectItem>
                  <SelectItem value="price_list">Price List</SelectItem>
                  <SelectItem value="call_me">Call Me</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message (optional)</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add details..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRFI(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!selectedConnection || createMutation.isPending}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}