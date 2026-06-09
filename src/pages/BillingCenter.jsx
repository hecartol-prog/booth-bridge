import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, CheckCircle2, Clock, TrendingUp, Receipt, Download,
  Crown, Star, Zap, Shield, ExternalLink, RefreshCw
} from "lucide-react";

const PLANS = [
  {
    id: "premium_booth",
    name: "Premium Booth",
    price: 49,
    interval: "month",
    icon: Crown,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    features: [
      "Featured listing in search results",
      "Priority placement on event pages",
      "Lead Intelligence analytics",
      "Advanced buyer insights",
      "Sponsored badge on profile",
      "Up to 50 products",
      "Catalog uploads",
    ]
  },
  {
    id: "featured_supplier",
    name: "Featured Supplier",
    price: 99,
    interval: "month",
    icon: Star,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    features: [
      "Everything in Premium Booth",
      "Homepage featured placement",
      "Cross-event visibility",
      "Advanced CRM integrations",
      "Priority support",
      "Unlimited products",
      "Custom domain profile",
    ]
  },
  {
    id: "organizer",
    name: "Organizer Pro",
    price: 299,
    interval: "month",
    icon: Zap,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    features: [
      "Full event management suite",
      "NFC badge management",
      "Exhibitor analytics dashboard",
      "Buyer journey tracking",
      "Command center access",
      "API access",
      "Dedicated support",
    ]
  },
];

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-200",
  trial: "bg-blue-100 text-blue-800 border-blue-200",
  past_due: "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  expired: "bg-red-100 text-red-800 border-red-200",
};

export default function BillingCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["billing-subscriptions", user?.id],
    queryFn: () => base44.entities.BillingSubscription.filter({ user_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["billing-transactions", user?.id],
    queryFn: () => base44.entities.BillingTransaction.filter({ user_id: user.id }, "-created_date", 50),
    enabled: !!user?.id,
  });

  const activeSub = subscriptions.find(s => s.status === "active" || s.status === "trial");
  const totalSpend = transactions
    .filter(t => t.type === "charge" && t.status === "succeeded")
    .reduce((s, t) => s + (t.amount || 0), 0);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "plans", label: "Plans" },
    { id: "transactions", label: "Transactions" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">Billing Center</h1>
          <p className="text-xs text-muted-foreground">Manage your subscriptions and payments</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
              tab === t.id ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div className="space-y-4">
          {activeSub ? (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Plan</p>
                    <p className="text-xl font-display font-bold">{activeSub.plan_name}</p>
                    <Badge className={`text-xs border mt-1 ${STATUS_COLORS[activeSub.status] || STATUS_COLORS.active}`}>
                      {activeSub.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">${activeSub.amount}</p>
                    <p className="text-xs text-muted-foreground">per {activeSub.interval}</p>
                  </div>
                </div>
                {activeSub.current_period_end && (
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Renews {new Date(activeSub.current_period_end).toLocaleDateString()}
                    {activeSub.cancel_at_period_end && " (cancels at period end)"}
                  </p>
                )}
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Manage Plan
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Billing Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-5 text-center border-dashed">
              <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-semibold text-sm">No active subscription</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Upgrade to unlock premium features.</p>
              <Button size="sm" onClick={() => setTab("plans")}>View Plans</Button>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-display font-bold">${totalSpend.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Total Spent</p>
            </Card>
            <Card className="p-4 text-center">
              <Receipt className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-display font-bold">{transactions.filter(t => t.status === "succeeded").length}</p>
              <p className="text-[10px] text-muted-foreground">Transactions</p>
            </Card>
            <Card className="p-4 text-center">
              <Shield className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-display font-bold">{subscriptions.length}</p>
              <p className="text-[10px] text-muted-foreground">Subscriptions</p>
            </Card>
          </div>

          {transactions.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Transactions</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.slice(0, 5).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{tx.description || "Subscription"}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.provider?.toUpperCase()} · {new Date(tx.created_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${tx.type === "refund" ? "text-green-600" : ""}`}>
                          {tx.type === "refund" ? "+" : "-"}${tx.amount}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${tx.status === "succeeded" ? "text-green-600 border-green-300" : "text-red-600 border-red-300"}`}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PLANS */}
      {tab === "plans" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choose the plan that best fits your needs.</p>
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isActive = activeSub?.plan_type === plan.id;
            return (
              <Card key={plan.id} className={`overflow-hidden ${isActive ? "border-2 border-primary" : ""}`}>
                <CardContent className="p-0">
                  <div className={`${plan.bg} ${plan.border} border-b p-4 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${plan.color}`} />
                      <div>
                        <p className="font-bold text-sm">{plan.name}</p>
                        {isActive && <Badge className="text-[10px] bg-primary/20 text-primary">Current Plan</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-display font-bold">${plan.price}</p>
                      <p className="text-xs text-muted-foreground">/{plan.interval}</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <ul className="space-y-1.5 mb-4">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" disabled={isActive} className="text-xs">
                        {isActive ? "Current Plan" : "Pay with Stripe"}
                      </Button>
                      <Button size="sm" variant="outline" disabled={isActive} className="text-xs">
                        Pay with PayPal
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center mt-2">
                      Secure payment · Cancel anytime
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* TRANSACTIONS */}
      {tab === "transactions" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{transactions.length} transactions</p>
            <Button variant="outline" size="sm">
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </div>
          {transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No transactions yet</p>
            </Card>
          ) : (
            transactions.map(tx => (
              <Card key={tx.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{tx.description || "Subscription charge"}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.provider?.toUpperCase()} · {new Date(tx.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === "refund" ? "text-green-600" : ""}`}>
                      {tx.type === "refund" ? "+" : "-"}${tx.amount} {tx.currency}
                    </p>
                    <Badge variant="outline" className={`text-[10px] mt-1 ${
                      tx.status === "succeeded" ? "text-green-600 border-green-300" :
                      tx.status === "failed" ? "text-red-600 border-red-300" : "text-amber-600 border-amber-300"
                    }`}>{tx.status}</Badge>
                  </div>
                </div>
                {(tx.invoice_url || tx.receipt_url) && (
                  <div className="flex gap-2 mt-3">
                    {tx.invoice_url && (
                      <a href={tx.invoice_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Invoice
                      </a>
                    )}
                    {tx.receipt_url && (
                      <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Receipt className="w-3 h-3" /> Receipt
                      </a>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}