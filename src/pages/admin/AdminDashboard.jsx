import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Package, FileText, MessageSquare, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => base44.entities.User.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ["admin-exhibitors"], queryFn: () => base44.entities.ExhibitorProfile.list() });
  const { data: buyers = [] } = useQuery({ queryKey: ["admin-buyers"], queryFn: () => base44.entities.BuyerProfile.list() });
  const { data: products = [] } = useQuery({ queryKey: ["admin-products"], queryFn: () => base44.entities.Product.list() });
  const { data: catalogues = [] } = useQuery({ queryKey: ["admin-catalogues"], queryFn: () => base44.entities.CatalogItem.list() });
  const { data: connections = [] } = useQuery({ queryKey: ["admin-connections"], queryFn: () => base44.entities.Connection.list() });

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50", link: "/admin/users" },
    { label: "Exhibitors", value: exhibitors.length, icon: Building2, color: "text-purple-600", bg: "bg-purple-50", link: "/admin/exhibitors" },
    { label: "Buyers", value: buyers.length, icon: Users, color: "text-green-600", bg: "bg-green-50", link: "/admin/users" },
    { label: "Products", value: products.length, icon: Package, color: "text-orange-600", bg: "bg-orange-50", link: "/admin/products" },
    { label: "Catalogues", value: catalogues.length, icon: FileText, color: "text-red-600", bg: "bg-red-50", link: "/admin/catalogues" },
    { label: "Connections", value: connections.length, icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50", link: "/admin/connections" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of all platform data</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(stat => (
          <Link key={stat.label} to={stat.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}