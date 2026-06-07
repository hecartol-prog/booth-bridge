import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 text-sm mt-1">All registered users</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input className="pl-9" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">App Role</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Onboarded</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{u.full_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role || "user"}</Badge>
                </td>
                <td className="px-4 py-3">
                  {u.user_role ? (
                    <Badge variant="outline" className={u.user_role === "exhibitor" ? "border-purple-300 text-purple-700" : "border-green-300 text-green-700"}>
                      {u.user_role}
                    </Badge>
                  ) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${u.onboarded ? "text-green-600" : "text-slate-400"}`}>
                    {u.onboarded ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}