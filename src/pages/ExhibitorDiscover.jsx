import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Building2, MapPin, Package, ChevronRight, X, Filter
} from "lucide-react";
import DigitalBooth from "./DigitalBooth";
import OfflineBanner from "@/components/OfflineBanner";
import { cacheWrite, cacheRead } from "@/utils/visitorCache";

export default function ExhibitorDiscover() {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [factoryFilter, setFactoryFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("event") || "all";
  });
  const [viewBoothId, setViewBoothId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const { data: exhibitors = [], isLoading } = useQuery({
    queryKey: ["discover-exhibitors"],
    queryFn: async () => {
      const result = await db.ExhibitorProfile.list("-created_date", 500);
      cacheWrite("exhibitors", result);
      return result;
    },
    placeholderData: () => cacheRead("exhibitors") || [],
  });

  const countries = [...new Set(exhibitors.map(e => e.country).filter(Boolean))].sort();
  const events = [...new Set(exhibitors.map(e => e.event_name).filter(Boolean))].sort();

  const filtered = exhibitors.filter(ex => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      ex.company_name?.toLowerCase().includes(q) ||
      ex.description?.toLowerCase().includes(q) ||
      ex.product_categories?.some(c => c.toLowerCase().includes(q)) ||
      ex.certifications?.some(c => c.toLowerCase().includes(q));
    const matchCountry = countryFilter === "all" || ex.country === countryFilter;
    const matchFactory = factoryFilter === "all" || ex.factory_type === factoryFilter;
    const matchEvent = eventFilter === "all" || ex.event_name === eventFilter;
    return matchSearch && matchCountry && matchFactory && matchEvent;
  });

  const activeFilterCount = [countryFilter, factoryFilter, eventFilter].filter(f => f !== "all").length;

  if (viewBoothId) {
    return <DigitalBooth exhibitorUserId={viewBoothId} onBack={() => setViewBoothId(null)} />;
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <OfflineBanner isOnline={isOnline} />
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Discover Exhibitors</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse and filter {exhibitors.length} exhibitors across all events</p>
      </div>

      {/* Search bar + filter toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search companies, products, certifications..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-muted/40 rounded-xl border">
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="All Events" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="All Countries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={factoryFilter} onValueChange={setFactoryFilter}>
            <SelectTrigger className="w-44 bg-white"><SelectValue placeholder="Factory Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="manufacturer">Manufacturer</SelectItem>
              <SelectItem value="trading_company">Trading Company</SelectItem>
              <SelectItem value="both">Manufacturer + Trader</SelectItem>
              <SelectItem value="agent">Agent</SelectItem>
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setCountryFilter("all"); setFactoryFilter("all"); setEventFilter("all"); }}>
              <X className="w-3 h-3 mr-1" /> Clear all
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-4">{filtered.length} exhibitors found</p>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold">No exhibitors found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search or clear filters</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(ex => (
            <Card
              key={ex.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setViewBoothId(ex.user_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {ex.logo_url ? (
                    <img src={ex.logo_url} className="w-12 h-12 rounded-xl object-cover border shrink-0" alt={ex.company_name} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-primary/60" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{ex.company_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {ex.country && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-2.5 h-2.5" /> {ex.country}
                        </span>
                      )}
                      {ex.booth_number && (
                        <span className="text-xs text-muted-foreground">Booth {ex.booth_number}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>

                {ex.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ex.description}</p>
                )}

                {ex.product_categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ex.product_categories.slice(0, 3).map(cat => (
                      <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0">{cat}</Badge>
                    ))}
                    {ex.product_categories.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{ex.product_categories.length - 3}</Badge>
                    )}
                  </div>
                )}

                {ex.event_name && (
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Package className="w-3 h-3" /> {ex.event_name}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}