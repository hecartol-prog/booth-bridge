import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Download, CheckSquare, Square, Filter, X
} from "lucide-react";

/**
 * @param {{
 *   data?: any[],
 *   columns?: any[],
 *   isLoading?: boolean,
 *   onRowClick?: (row: any) => void,
 *   bulkActions?: any[],
 *   onExport?: (rows?: any[]) => void,
 *   title?: string,
 *   subtitle?: string,
 *   actions?: import('react').ReactNode,
 *   filterOptions?: any[],
 * }} props
 */
export default function AdminDataGrid({
  data = [],
  columns = [],
  isLoading = false,
  onRowClick = undefined,
  bulkActions = [],
  onExport = undefined,
  title = undefined,
  subtitle = undefined,
  actions = undefined,
  filterOptions = [],
}) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({});

  const filtered = useMemo(() => {
    let rows = [...data];
    // Global search
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(row =>
        columns.some(col => {
          const val = col.accessor ? row[col.accessor] : null;
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }
    // Column filters
    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== "all") {
        rows = rows.filter(row => String(row[key] || "") === val);
      }
    });
    // Sort
    if (sortCol) {
      rows.sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, search, filters, sortCol, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (accessor) => {
    if (sortCol === accessor) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(accessor); setSortDir("asc"); }
  };

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () => setSelected(s => s.length === paginated.length ? [] : paginated.map(r => r.id));

  const handleFilterChange = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const clearFilters = () => { setFilters({}); setSearch(""); setPage(1); };
  const hasFilters = search || Object.values(filters).some(v => v && v !== "all");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-xl font-bold text-slate-900">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9 h-9" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {filterOptions.map(opt => (
          <Select key={opt.key} value={filters[opt.key] || "all"} onValueChange={v => handleFilterChange(opt.key, v)}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder={opt.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {opt.label}</SelectItem>
              {opt.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ))}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-slate-500">
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {onExport && (
            <Button variant="outline" size="sm" onClick={() => onExport(filtered)} className="h-9 text-xs">
              <Download className="w-3 h-3 mr-1" /> Export
            </Button>
          )}
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-9 text-xs w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100, 500].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-xs font-medium text-primary">{selected.length} selected</span>
          <div className="flex gap-1 ml-2">
            {bulkActions.map(action => (
              <Button key={action.label} variant="outline" size="sm" className="h-7 text-xs"
                onClick={() => { action.onClick(selected); setSelected([]); }}>
                {action.icon && <action.icon className="w-3 h-3 mr-1" />}{action.label}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelected([])}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b sticky top-0 z-10">
            <tr>
              {bulkActions.length > 0 && (
                <th className="w-10 px-3 py-3">
                  <button onClick={toggleAll}>
                    {selected.length === paginated.length && paginated.length > 0
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-slate-400" />}
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th key={col.key || col.accessor}
                  className={`text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide whitespace-nowrap ${col.sortable !== false ? "cursor-pointer select-none hover:text-slate-900" : ""}`}
                  onClick={() => col.sortable !== false && col.accessor && toggleSort(col.accessor)}
                  style={{ width: col.width }}>
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && col.accessor && sortCol === col.accessor && (
                      sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              </td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">No records found</td></tr>
            ) : paginated.map(row => (
              <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick && onRowClick(row)}>
                {bulkActions.length > 0 && (
                  <td className="px-3 py-3" onClick={e => { e.stopPropagation(); toggleSelect(row.id); }}>
                    {selected.includes(row.id)
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-slate-400" />}
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key || col.accessor} className="px-4 py-3 text-slate-700">
                    {col.render ? col.render(row) : (col.accessor ? (row[col.accessor] ?? "—") : "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
        <span>{filtered.length} total records</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(1)}>«</Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <span className="px-2">Page {page} of {pageCount}</span>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === pageCount} onClick={() => setPage(pageCount)}>»</Button>
        </div>
      </div>
    </div>
  );
}