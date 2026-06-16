import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Building2, Search, Globe } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-green-50 text-green-700 border-green-200",
  past: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function EventsDirectory() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events-directory"],
    queryFn: () => db.Event.list("-start_date", 100),
  });

  const { data: exhibitors = [] } = useQuery({
    queryKey: ["events-exhibitors-count"],
    queryFn: () => db.ExhibitorProfile.list("-created_date", 500),
  });

  const countries = [...new Set(events.map(e => e.country).filter(Boolean))].sort();

  const getExhibitorCount = (eventName) =>
    exhibitors.filter(ex => ex.event_name === eventName).length;

  const filtered = events.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      ev.name?.toLowerCase().includes(q) ||
      ev.city?.toLowerCase().includes(q) ||
      ev.country?.toLowerCase().includes(q) ||
      ev.organizer?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || ev.status === filterStatus;
    const matchCountry = filterCountry === "all" || ev.country === filterCountry;
    return matchSearch && matchStatus && matchCountry;
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold">Events Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover trade shows and exhibitions worldwide</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="active">Active Now</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No events found</p>
          {events.length === 0 && <p className="text-sm mt-1">Events will appear here once added by an admin</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => {
            const exhibitorCount = getExhibitorCount(ev.name);
            return (
              <div key={ev.id} className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                {ev.banner_url && (
                  <img src={ev.banner_url} className="w-full h-28 object-cover" alt={ev.name} />
                )}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {ev.logo_url && (
                      <img src={ev.logo_url} className="w-12 h-12 rounded-lg object-cover border shrink-0" alt={ev.name} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base truncate">{ev.name}</h3>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[ev.status] || ""}`}>
                          {ev.status === "active" ? "🟢 Live Now" : ev.status === "upcoming" ? "Upcoming" : "Past"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {(ev.city || ev.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[ev.venue, ev.city, ev.country].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {(ev.start_date || ev.end_date) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ev.start_date && format(new Date(ev.start_date), "MMM d")}
                            {ev.end_date && ` – ${format(new Date(ev.end_date), "MMM d, yyyy")}`}
                          </span>
                        )}
                        {exhibitorCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {exhibitorCount} Exhibitors
                          </span>
                        )}
                        {ev.website && (
                          <a href={ev.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <Globe className="w-3 h-3" /> Website
                          </a>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ev.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}