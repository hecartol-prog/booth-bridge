import React from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import AdminDataGrid from "@/components/admin/AdminDataGrid";
import { exportToCSV } from "@/utils/adminExport";
import { Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const STATUS_ICONS = {
  success: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  blocked: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />,
};

const ACTION_COLORS = {
  login: "bg-green-100 text-green-700",
  logout: "bg-slate-100 text-slate-600",
  failed_login: "bg-red-100 text-red-700",
  password_change: "bg-yellow-100 text-yellow-700",
  user_management: "bg-blue-100 text-blue-700",
  revenue_access: "bg-purple-100 text-purple-700",
  system_config: "bg-orange-100 text-orange-700",
};

export default function AdminAuditLog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => db.AdminAccessLog.list("-created_date"),
  });

  const columns = [
    { header: "Status", accessor: "status", render: r => (
      <div className="flex items-center gap-1.5">
        {STATUS_ICONS[r.status] || STATUS_ICONS.success}
        <span className="text-xs capitalize">{r.status}</span>
      </div>
    )},
    { header: "Admin", accessor: "email", render: r => <span className="text-sm font-medium">{r.email}</span> },
    { header: "Action", accessor: "action_performed", render: r => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[r.action_performed] || "bg-slate-100 text-slate-600"}`}>
        {(r.action_performed || "").replace(/_/g, " ")}
      </span>
    )},
    { header: "Device", accessor: "device", render: r => <span className="text-xs text-slate-500">{r.device || "—"}</span> },
    { header: "Browser", accessor: "browser", render: r => <span className="text-xs text-slate-500">{r.browser || "—"}</span> },
    { header: "IP Address", accessor: "ip_address", render: r => <span className="text-xs font-mono text-slate-400">{r.ip_address || "—"}</span> },
    { header: "Notes", accessor: "notes", render: r => <span className="text-xs text-slate-400 max-w-[200px] truncate block">{r.notes || "—"}</span> },
    { header: "Timestamp", accessor: "created_date", render: r => (
      <span className="text-xs text-slate-400">{r.created_date ? new Date(r.created_date).toLocaleString() : "—"}</span>
    )},
  ];

  const filterOptions = [
    { key: "status", label: "Status", options: ["success","failed","blocked"].map(v => ({ value: v, label: v })) },
    { key: "action_performed", label: "Action", options: ["login","logout","failed_login","password_change","user_management","revenue_access","system_config"].map(v => ({ value: v, label: v.replace(/_/g, " ") })) },
  ];

  const successCount = logs.filter(l => l.status === "success").length;
  const failedCount = logs.filter(l => l.status === "failed").length;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Activity className="w-5 h-5 text-indigo-500" /> Audit Log</h2>
        <p className="text-sm text-slate-500 flex items-center gap-3">
          {logs.length} total entries
          <span className="text-green-600">✓ {successCount} successful</span>
          <span className="text-red-500">✕ {failedCount} failed</span>
        </p>
      </div>
      <AdminDataGrid
        data={logs}
        columns={columns}
        isLoading={isLoading}
        filterOptions={filterOptions}
        onExport={rows => exportToCSV(rows, "audit-log")}
        bulkActions={[{ label: "Export CSV", onClick: ids => exportToCSV(logs.filter(l => ids.includes(l.id)), "audit-log") }]}
      />
    </div>
  );
}