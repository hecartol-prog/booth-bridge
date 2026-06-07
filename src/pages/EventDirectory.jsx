import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Calendar, Building2, Globe, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

const STATUS_COLORS = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  past: "bg-slate-100 text-slate-500",
};

export default function EventDirectory() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-start_date", 200),
  });

  const { data: exhibitorCounts = {} } = useQuery({
    queryKey: ["event-exhibitor-counts"],
    queryFn: async () => {
      const exhibitors = await base44.entities.ExhibitorProfile.list();
      return exhibitors.reduce((acc, ex) => {
        if (ex.event_name) acc[ex.event_name] = (acc[ex.event_name] || 0) + 1;
        return acc;
      }, {});
    },
  });

  const countries = [...new Set(events.map(e => e.country).filter(Boolean))].sort();

  const filtered = events.filter(ev => {
    const matchSearch = !search ||
      ev.name?.toLowerCase().includes(search.toLowerCase()) ||
      ev.city?.toLowerCase().includes(search.toLowerCase()) ||
      ev.country?.toLowerCase().includes(search.toLowerCase()) ||
      ev.organizer?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || ev.status === statusFilter;
    const matchCountry = countryFilter === "all" || ev.country === countryFilter;
    return matchSearch && matchStatus && matchCountry;
  });

  const grouped = {
    active: filtered.filter(e => e.status === "active"),
    upcoming: filtered.filter(e => e.status === "upcoming"),
    past: filtered.filter(e => e.status === "past"),
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Event Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover trade shows and exhibitions worldwide</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Now</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading events...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold">No events found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([status, evs]) => evs.length === 0 ? null : (
            <div key={status}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 capitalize">{status}</h2>
              <div className="space-y-3">
                {evs.map(ev => (
                  <Card key={ev.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex">
                        {ev.banner_url || ev.logo_url ? (
                          <div className="w-24 h-24 shrink-0 bg-muted">
                            <img src={ev.banner_url || ev.logo_url} className="w-full h-full object-cover" alt={ev.name} />
                          </div>
                        ) : (
                          <div className="w-24 h-24 shrink-0 bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-primary/40" />
                          </div>
                        )}
                        <div className="flex-1 p-4 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm truncate">{ev.name}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[ev.status]}`}>{ev.status}</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {(ev.city || ev.country) && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" /> {[ev.city, ev.country].filter(Boolean).join(", ")}
                                  </span>
                                )}
                                {ev.start_date && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(ev.start_date), "MMM d")}
                                    {ev.end_date && ` – ${format(new Date(ev.end_date), "MMM d, yyyy")}`}
                                  </span>
                                )}
                              </div>
                              {ev.organizer && (
                                <p className="text-xs text-muted-foreground mt-0.5">by {ev.organizer}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-primary">{exhibitorCounts[ev.name] || 0}</p>
                              <p className="text-[10px] text-muted-foreground">exhibitors</p>
                            </div>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <Link to={`/discover?event=${encodeURIComponent(ev.name)}`}>
                              <Button size="sm" variant="outline" className="text-xs h-7 px-3">
                                View Exhibitors <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                            {ev.website && (
                              <a href={ev.website} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost" className="text-xs h-7 px-3">
                                  <Globe className="w-3 h-3 mr-1" /> Website
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
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