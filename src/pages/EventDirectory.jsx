import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import OfflineBanner from "@/components/OfflineBanner";
import { cacheWrite, cacheRead } from "@/utils/visitorCache";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Calendar, Building2, Globe, ChevronRight, ArrowUpDown } from "lucide-react";
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
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("status"); // "status" | "date_asc" | "date_desc" | "industry"
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const result = await db.Event.list("-start_date", 200);
      cacheWrite("events", result);
      return result;
    },
    placeholderData: () => cacheRead("events") || [],
  });

  const { data: exhibitorCounts = { byEventId: {}, byName: {} } } = useQuery({
    queryKey: ["event-exhibitor-counts"],
    queryFn: async () => {
      const exhibitors = await db.ExhibitorProfile.list();
      // Count by both event_id and event_name so either matching field works
      const countsByName = {};
      const countsByEventId = {};
      exhibitors.forEach(ex => {
        if (ex.event_name) countsByName[ex.event_name] = (countsByName[ex.event_name] || 0) + 1;
        if (ex.event_id) countsByEventId[ex.event_id] = (countsByEventId[ex.event_id] || 0) + 1;
      });
      cacheWrite("exhibitor-counts", { byName: countsByName, byEventId: countsByEventId });
      return { byName: countsByName, byEventId: countsByEventId };
    },
    placeholderData: () => {
      const cached = cacheRead("exhibitor-counts");
      return cached?.byName ? cached : { byName: {}, byEventId: {} };
    },
  });

  const countries = [...new Set(events.map(e => e.country).filter(Boolean))].sort();
  const industries = [...new Set(events.map(e => e.industry).filter(Boolean))].sort();

  const filtered = events.filter(ev => {
    const matchSearch = !search ||
      ev.name?.toLowerCase().includes(search.toLowerCase()) ||
      ev.city?.toLowerCase().includes(search.toLowerCase()) ||
      ev.country?.toLowerCase().includes(search.toLowerCase()) ||
      ev.organizer?.toLowerCase().includes(search.toLowerCase()) ||
      ev.industry?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || ev.status === statusFilter;
    const matchCountry = countryFilter === "all" || ev.country === countryFilter;
    const matchIndustry = industryFilter === "all" || ev.industry === industryFilter;
    return matchSearch && matchStatus && matchCountry && matchIndustry;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "date_asc") return (a.start_date || "") > (b.start_date || "") ? 1 : -1;
    if (sortOrder === "date_desc") return (a.start_date || "") < (b.start_date || "") ? 1 : -1;
    if (sortOrder === "industry") return (a.industry || "").localeCompare(b.industry || "");
    // default: group by status (active → upcoming → past)
    const order = { active: 0, upcoming: 1, past: 2 };
    return (order[a.status] ?? 1) - (order[b.status] ?? 1);
  });

  // For status grouping mode, group; otherwise show flat list
  const useGrouped = sortOrder === "status";
  const grouped = {
    active: sorted.filter(e => e.status === "active"),
    upcoming: sorted.filter(e => e.status === "upcoming"),
    past: sorted.filter(e => e.status === "past"),
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <OfflineBanner isOnline={isOnline} />
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Event Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">Discover trade shows and exhibitions worldwide</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search events, cities, industries..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Now</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Industry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <ArrowUpDown className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Group by Status</SelectItem>
              <SelectItem value="date_asc">Date: Earliest First</SelectItem>
              <SelectItem value="date_desc">Date: Latest First</SelectItem>
              <SelectItem value="industry">Sort by Industry</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || countryFilter !== "all" || industryFilter !== "all" || search) && (
            <button onClick={() => { setSearch(""); setStatusFilter("all"); setCountryFilter("all"); setIndustryFilter("all"); setSortOrder("status"); }}
              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border rounded-md hover:bg-muted transition-colors">
              Clear filters
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{sorted.length} event{sorted.length !== 1 ? "s" : ""} found</p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading events...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold">No events found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
        </div>
      ) : useGrouped ? (
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
                                {ev.industry && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{ev.industry}</span>}
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
                              <p className="text-lg font-bold text-primary">{(exhibitorCounts.byEventId?.[ev.id] || 0) + (exhibitorCounts.byName?.[ev.name] && !exhibitorCounts.byEventId?.[ev.id] ? exhibitorCounts.byName[ev.name] : 0)}</p>
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
      ) : (
        <div className="space-y-3">
          {sorted.map(ev => (
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
                          {ev.industry && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{ev.industry}</span>}
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
                        {ev.organizer && <p className="text-xs text-muted-foreground mt-0.5">by {ev.organizer}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-primary">{(exhibitorCounts.byEventId?.[ev.id] || 0) + (exhibitorCounts.byName?.[ev.name] && !exhibitorCounts.byEventId?.[ev.id] ? exhibitorCounts.byName[ev.name] : 0)}</p>
                        <p className="text-[10px] text-muted-foreground">exhibitors</p>
                      </div>
                    </div>
                    {ev.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ev.description}</p>}
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
      )}
    </div>
  );
}