import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Calendar, ArrowRight, CheckCircle } from "lucide-react";
import { formatMeetingSlot } from "@/utils/venueTimezone";
import { Link } from "react-router-dom";

const priorityConfig = {
  high:   { color: "bg-red-50 border-red-200",   badge: "bg-red-100 text-red-700",    icon: AlertTriangle, iconColor: "text-red-500"  },
  medium: { color: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", icon: Clock,         iconColor: "text-amber-500" },
  low:    { color: "bg-blue-50 border-blue-200",  badge: "bg-blue-100 text-blue-700",  icon: CheckCircle,   iconColor: "text-blue-500"  },
};

function FollowUpCard({ action, onMarkResponded }) {
  const cfg = priorityConfig[action.priority] || priorityConfig.medium;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border p-3 ${cfg.color}`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{action.message}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {action.type === "schedule_meeting" ? (
              <Link to="/meetings">
                <Button size="sm" className="h-7 text-xs">{action.cta}</Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onMarkResponded && onMarkResponded(action.boothId)}>
                {action.cta}
              </Button>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {action.priority === "high" ? "14-day follow-up" : "3-day check-in"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaleRFICard({ rfi }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
      <div className="flex items-start gap-2.5">
        <Clock className="w-4 h-4 mt-0.5 shrink-0 text-orange-500" />
        <div className="flex-1">
          <p className="text-sm font-medium">Pending: {rfi.request_type?.replace(/_/g, " ")} request to {rfi.exhibitor_company}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sent {rfi.created_date ? formatMeetingSlot(rfi.created_date) : "—"} · No reply yet</p>
          <Link to="/my-rfis">
            <Button size="sm" variant="outline" className="h-7 text-xs mt-2">View RFI <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function UpcomingMeetingCard({ meeting }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-start gap-2.5">
        <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">{meeting.title || "Upcoming Meeting"}</p>
          {meeting.proposed_time && (
            <p className="text-xs text-muted-foreground mt-0.5">{formatMeetingSlot(meeting.proposed_time)}</p>
          )}
          <Link to="/meetings">
            <Button size="sm" variant="ghost" className="h-7 text-xs mt-1 p-0 text-primary hover:text-primary">
              View Details <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ActionQueue({ followUpActions = [], staleRFIs = [], upcomingMeetings = [], onMarkResponded }) {
  const total = followUpActions.length + staleRFIs.length + upcomingMeetings.length;
  if (total === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-heading font-semibold">Action Required</h2>
        <Badge variant="destructive" className="text-[10px] px-2 h-5">{total}</Badge>
      </div>
      <div className="space-y-2">
        {upcomingMeetings.slice(0, 2).map(m => <UpcomingMeetingCard key={m.id} meeting={m} />)}
        {staleRFIs.slice(0, 3).map(r => <StaleRFICard key={r.id} rfi={r} />)}
        {followUpActions.map(a => <FollowUpCard key={a.id} action={a} onMarkResponded={onMarkResponded} />)}
      </div>
    </div>
  );
}