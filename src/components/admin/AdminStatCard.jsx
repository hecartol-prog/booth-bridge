import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminStatCard({ label, value, icon: Icon, color = "text-blue-600", bg = "bg-blue-50", sub, link, trend, trendVal }) {
  const inner = (
    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          {trend && (
            <span className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-500"}`}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendVal}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">{value}</p>
        <p className="text-xs font-medium text-slate-700 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}