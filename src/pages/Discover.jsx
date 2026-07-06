import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Building2, MapPin, Filter, X } from "lucide-react";
import DigitalBooth from "./DigitalBooth";

const FACTORY_TYPES = { manufacturer: "Manufacturer", trading_company: "Trading Co.", both: "Manufacturer & Trader", agent: "Agent" };

export default function Discover() {
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterFactory, setFilterFactory] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [viewBooth, setViewBooth] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: exhibitors = [], isLoading } = useQuery({
    queryKey: ["discover-exhibitors"],
    queryFn: () => db.ExhibitorProfile.list("-created_date", 200),
  });

  const countries = [...new Set(exhibitors.map(e => e.country).filter(Boolean))].sort();
  const allCategories = [...new Set(exhibitors.flatMap(e => e.product_categories || []))].sort();

  const filtered = exhibitors.filter(ex => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      ex.company_name?.toLowerCase().includes(q) ||
      ex.description?.toLowerCase().includes(q) ||
      (ex.product_categories || []).some(c => c.toLowerCase().includes(q));
    const matchCountry = filterCountry === "all" || ex.country === filterCountry;
    const matchFactory = filterFactory === "all" || ex.factory_type === filterFactory;
    const matchCat = !filterCategory || (ex.product_categories || []).includes(filterCategory);
    return matchSearch && matchCountry && matchFactory && matchCat;
  });

  const hasFilters = filterCountry !== "all" || filterFactory !== "all" || !!filterCategory;

  if (viewBooth) {
    return <DigitalBooth exhibitorUserId={viewBooth} onBack={() => setViewBooth(null)} />;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-display font-bold">Discover Exhibitors</h1>
        <p className="text-sm text-muted-foreground mt-1">Find suppliers, manufacturers and partners at the show</p>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search company, products, category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={showFilters || hasFilters ? "default" : "outline"} size="icon" onClick={() => setShowFilters(f => !f)}>
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-muted/50 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Country</label>
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger><SelectValue placeholder="All countries" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Factory Type</label>
              <Select value={filterFactory} onValueChange={setFilterFactory}>
                <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(FACTORY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Product Category</label>
              <Select value={filterCategory || "all"} onValueChange={v => setFilterCategory(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setFilterCountry("all"); setFilterFactory("all"); setFilterCategory(""); }}>
              <X className="w-3 h-3 mr-1" /> Clear filters
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-3">{filtered.length} exhibitors found</p>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No exhibitors found</p>
          <p className="text-sm mt-1">Try different keywords or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(ex => (
            <button
              key={ex.id}
              onClick={() => setViewBooth(ex.user_id)}
              className="text-left bg-card border rounded-xl p-4 hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3">
                {ex.logo_url ? (
                  <img src={ex.logo_url} className="w-12 h-12 rounded-lg object-cover border shrink-0" alt={ex.company_name} />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{ex.company_name}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {ex.country && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />{ex.country}
                      </span>
                    )}
                    {ex.booth_number && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">Booth {ex.booth_number}</Badge>
                    )}
                  </div>
                  {ex.factory_type && (
                    <Badge variant="secondary" className="text-[10px] mt-1">{FACTORY_TYPES[ex.factory_type]}</Badge>
                  )}
                  {ex.product_categories?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {ex.product_categories.slice(0, 3).map(c => (
                        <span key={c} className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {ex.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{ex.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}