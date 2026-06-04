import React from "react";
import { useAuth } from "@/lib/AuthContext";
import ExhibitorDashboard from "./ExhibitorDashboard";
import BuyerDashboard from "./BuyerDashboard";

export default function Home() {
  const { user } = useAuth();
  
  const isExhibitor = user?.role === "exhibitor" || user?.user_type === "exhibitor";
  if (isExhibitor) return <ExhibitorDashboard />;
  return <BuyerDashboard />;
}