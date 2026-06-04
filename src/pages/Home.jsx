import React from "react";
import { useAuth } from "@/lib/AuthContext";
import ExhibitorDashboard from "./ExhibitorDashboard";
import BuyerDashboard from "./BuyerDashboard";

export default function Home() {
  const { user } = useAuth();
  
  if (user?.user_role === "exhibitor") return <ExhibitorDashboard />;
  return <BuyerDashboard />;
}