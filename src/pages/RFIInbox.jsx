import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/utils/dbClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Inbox, FileText, Phone, Package, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const typeIcons = {
  brochure: FileText,
  sample: Package,
  price_list: DollarSign,
  call_me: Phone,
};

const typeLabels = {
  brochure: "Brochure",
  sample: "Sample",
  price_list: "Price List",
  call_me: "Call Me",
};

export default function RFIInbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyDialog, setReplyDialog] = useState(null);
  const [replyText, setReplyText] = useState("");

  const { data: rfis = [], isLoading } = useQuery({
    queryKey: ["rfi-inbox", user?.id],
    queryFn: () => db.RFI.filter({ exhibitor_user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const replyMutation = useMutation({
    mutationFn: async (/** @type {any} */ { id, reply }) => {
      await db.RFI.update(id, { reply, status: "replied" });
      const rfi = rfis.find(r => r.id === id);
      if (rfi) {
        await db.Notification.create({
          user_id: rfi.buyer_user_id,
          type: "rfi_replied",
          title: "RFI Replied",
          message: `${user.full_name} replied to your ${typeLabels[rfi.request_type]} request.`,
          from_user_name: user.full_name,
          related_id: id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfi-inbox"] });
      setReplyDialog(null);
      setReplyText("");
    },
  });

  const pending = rfis.filter(r => r.status === "pending");
  const replied = rfis.filter(r => r.status === "replied");

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">RFI Inbox</h1>
        <Badge variant="outline">{pending.length} pending</Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : rfis.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...pending, ...replied].map(rfi => {
            const Icon = typeIcons[rfi.request_type] || FileText;
            return (
              <Card key={rfi.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      rfi.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{typeLabels[rfi.request_type]}</p>
                        <Badge variant={rfi.status === "pending" ? "outline" : "default"} className="text-xs">
                          {rfi.status === "pending" ? <><Clock className="w-3 h-3 mr-1" /> Pending</> : <><CheckCircle2 className="w-3 h-3 mr-1" /> Replied</>}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        From: {rfi.buyer_name} {rfi.buyer_company && `· ${rfi.buyer_company}`}
                      </p>
                      {rfi.message && (
                        <p className="text-sm mt-2 bg-muted p-2 rounded">{rfi.message}</p>
                      )}
                      {rfi.reply && (
                        <p className="text-sm mt-2 bg-primary/5 p-2 rounded border-l-2 border-primary">
                          <span className="text-xs font-medium text-primary">Your reply:</span><br />
                          {rfi.reply}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(rfi.created_date), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                  {rfi.status === "pending" && (
                    <Button size="sm" onClick={() => { setReplyDialog(rfi); setReplyText(""); }}>
                      Reply
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!replyDialog} onOpenChange={() => setReplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {replyDialog?.buyer_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Request: {typeLabels[replyDialog?.request_type]}
          </p>
          {replyDialog?.message && (
            <p className="text-sm bg-muted p-2 rounded">{replyDialog.message}</p>
          )}
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(null)}>Cancel</Button>
            <Button
              onClick={() => replyMutation.mutate({ id: replyDialog.id, reply: replyText })}
              disabled={!replyText || replyMutation.isPending}
            >
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}