import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLORS = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminConnections() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["admin-connections"],
    queryFn: () => db.Connection.list("-created_date", 300),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => db.Connection.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-connections"] });
      toast({ title: "Connection deleted" });
    },
  });

  const filtered = connections.filter(c =>
    c.exhibitor_company?.toLowerCase().includes(search.toLowerCase()) ||
    c.buyer_company?.toLowerCase().includes(search.toLowerCase()) ||
    c.exhibitor_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.buyer_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Connections</h1>
        <p className="text-slate-500 text-sm mt-1">All buyer-exhibitor connections</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search by company or name..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Exhibitor</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Buyer</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Event</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Initiated By</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No connections found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{c.exhibitor_company || "—"}</p>
                  <p className="text-xs text-slate-400">{c.exhibitor_name}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{c.buyer_company || "—"}</p>
                  <p className="text-xs text-slate-400">{c.buyer_name}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{c.event_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] || ""}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 capitalize">{c.initiated_by || "—"}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {c.created_date ? new Date(c.created_date).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => deleteMut.mutate(c.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}