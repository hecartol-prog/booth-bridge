import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminDataGrid from "@/components/admin/AdminDataGrid";
import { exportToCSV } from "@/utils/adminExport";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STATUS_COLORS = {
  active: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  pending: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  archived: "bg-slate-100 text-slate-500",
};

export default function AdminProducts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const saveMutation = useMutation({
    mutationFn: d => d.id ? base44.entities.Product.update(d.id, d) : base44.entities.Product.create(d),
    onSuccess: () => { qc.invalidateQueries(["admin-products"]); toast({ title: "Product saved" }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: id => base44.entities.Product.delete(id),
    onSuccess: () => { qc.invalidateQueries(["admin-products"]); toast({ title: "Product deleted" }); },
  });

  const bulkApprove = async (ids) => {
    await Promise.all(ids.map(id => base44.entities.Product.update(id, { status: "active" })));
    qc.invalidateQueries(["admin-products"]); toast({ title: `${ids.length} products approved` });
  };

  const bulkReject = async (ids) => {
    await Promise.all(ids.map(id => base44.entities.Product.update(id, { status: "rejected" })));
    qc.invalidateQueries(["admin-products"]); toast({ title: `${ids.length} products rejected` });
  };

  const columns = [
    { header: "Image", sortable: false, render: r => r.images?.[0] || r.image_url ? (
      <img src={r.images?.[0] || r.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
    ) : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs">No img</div> },
    { header: "Product Name", accessor: "title", render: r => <span className="font-medium">{r.title || r.name || "—"}</span> },
    { header: "Category", accessor: "category", render: r => <span className="text-xs text-slate-500">{r.category || "—"}</span> },
    { header: "Status", accessor: "status", render: r => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status || "active"}</span>
    )},
    { header: "MOQ", accessor: "moq", render: r => <span className="text-xs">{r.moq || "—"}</span> },
    { header: "Created", accessor: "created_date", render: r => <span className="text-xs text-slate-400">{r.created_date ? new Date(r.created_date).toLocaleDateString() : "—"}</span> },
    { header: "Actions", sortable: false, render: r => (
      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing({ ...r })}><Edit className="w-3 h-3" /></Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-green-600" onClick={() => saveMutation.mutate({ ...r, status: "active" })}><CheckCircle className="w-3 h-3" /></Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate(r.id); }}><Trash2 className="w-3 h-3" /></Button>
      </div>
    )},
  ];

  const filterOptions = [
    { key: "status", label: "Status", options: ["active","draft","pending","rejected","archived"].map(v => ({ value: v, label: v })) },
    { key: "category", label: "Category", options: [...new Set(products.map(p => p.category).filter(Boolean))].map(v => ({ value: v, label: v })) },
  ];

  const bulkActions = [
    { label: "Approve", icon: CheckCircle, onClick: bulkApprove },
    { label: "Reject", icon: XCircle, onClick: bulkReject },
    { label: "Export CSV", onClick: ids => exportToCSV(products.filter(p => ids.includes(p.id)), "products") },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      <AdminDataGrid
        data={products}
        columns={columns}
        isLoading={isLoading}
        title="Product Database"
        subtitle={`${products.length} products`}
        filterOptions={filterOptions}
        bulkActions={bulkActions}
        onExport={rows => exportToCSV(rows, "products")}
        actions={<Button size="sm" onClick={() => setEditing({})}><Plus className="w-4 h-4 mr-1" /> New Product</Button>}
      />

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing.id ? `Edit: ${editing.title || editing.name}` : "New Product"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[["title", "Product Name", "col-span-2"], ["category", "Category"], ["moq", "MOQ (Min Order Qty)"], ["lead_time", "Lead Time"], ["price_range", "Price Range"]].map(([key, label, cls = ""]) => (
                <div key={key} className={cls}>
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <Input value={editing[key] || ""} onChange={e => setEditing(d => ({ ...d, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Select value={editing.status || "active"} onValueChange={v => setEditing(d => ({ ...d, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active","draft","pending","rejected","archived"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <Input value={editing.description || ""} onChange={e => setEditing(d => ({ ...d, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => saveMutation.mutate(editing)}>Save Product</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}