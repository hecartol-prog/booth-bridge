import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminDataGrid from "@/components/admin/AdminDataGrid";
import { exportToCSV, exportToJSON } from "@/utils/adminExport";
import { UserCheck, UserX, Edit, Download, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const ROLE_COLORS = { admin: "bg-red-100 text-red-700", user: "bg-slate-100 text-slate-700" };
const APP_ROLE_COLORS = { exhibitor: "bg-purple-100 text-purple-700", buyer: "bg-green-100 text-green-700" };

export default function AdminUsers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => db.User.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.User.update(id, data),
    onSuccess: () => { qc.invalidateQueries(["admin-users"]); toast({ title: "User updated" }); setEditing(null); },
  });

  const columns = [
    { header: "Name", accessor: "full_name", render: r => <span className="font-medium">{r.full_name || "—"}</span> },
    { header: "Email", accessor: "email", render: r => <span className="text-slate-600 text-xs">{r.email}</span> },
    { header: "Platform Role", accessor: "role", render: r => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[r.role] || "bg-slate-100 text-slate-600"}`}>{r.role || "user"}</span>
    )},
    { header: "App Role", accessor: "user_role", render: r => r.user_role ? (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APP_ROLE_COLORS[r.user_role] || "bg-slate-100"}`}>{r.user_role}</span>
    ) : <span className="text-slate-300 text-xs">—</span> },
    { header: "Onboarded", accessor: "onboarded", render: r => (
      <span className={`text-xs font-medium ${r.onboarded ? "text-green-600" : "text-slate-400"}`}>{r.onboarded ? "✓ Yes" : "No"}</span>
    )},
    { header: "Joined", accessor: "created_date", render: r => (
      <span className="text-xs text-slate-400">{r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}</span>
    )},
    { header: "Actions", sortable: false, render: r => (
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); setEditing(r); }}>
        <Edit className="w-3 h-3 mr-1" /> Edit
      </Button>
    )},
  ];

  const filterOptions = [
    { key: "role", label: "Role", options: [{ value: "admin", label: "Admin" }, { value: "user", label: "User" }] },
    { key: "user_role", label: "App Role", options: [{ value: "exhibitor", label: "Exhibitor" }, { value: "buyer", label: "Buyer" }] },
    { key: "onboarded", label: "Onboarded", options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }] },
  ];

  const bulkActions = [
    { label: "Export CSV", icon: Download, onClick: ids => exportToCSV(users.filter(u => ids.includes(u.id)), "users") },
    { label: "Export JSON", icon: Download, onClick: ids => exportToJSON(users.filter(u => ids.includes(u.id)), "users") },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      <AdminDataGrid
        data={users}
        columns={columns}
        isLoading={isLoading}
        title="User Management"
        subtitle={`${users.length} registered users`}
        filterOptions={filterOptions}
        bulkActions={bulkActions}
        onExport={rows => exportToCSV(rows, "users")}
        onRowClick={setEditing}
      />

      {/* Edit Dialog */}
      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User: {editing.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Email</p>
                <p className="text-sm font-medium">{editing.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Platform Role</p>
                <Select defaultValue={editing.role || "user"}
                  onValueChange={v => setEditing(e => ({ ...e, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">App Role</p>
                <Select defaultValue={editing.user_role || ""}
                  onValueChange={v => setEditing(e => ({ ...e, user_role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exhibitor">Exhibitor</SelectItem>
                    <SelectItem value="buyer">Buyer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => updateMutation.mutate({ id: editing.id, data: { role: editing.role, user_role: editing.user_role } })}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}