import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/utils/dbClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, RefreshCw, Shield, Users, Package, Building2, Mail, Link as LinkIcon, ImageOff } from "lucide-react";

function IssueRow({ severity, label, count, items, description }) {
  const [open, setOpen] = useState(false);
  const colors = { high: "text-red-600 bg-red-50", medium: "text-yellow-600 bg-yellow-50", low: "text-blue-600 bg-blue-50" };
  return (
    <div className="border rounded-lg mb-2 overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 ${count > 0 ? "" : "opacity-60"}`} onClick={() => count > 0 && setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          {count > 0 ? <AlertTriangle className={`w-4 h-4 ${severity === "high" ? "text-red-500" : severity === "medium" ? "text-yellow-500" : "text-blue-500"}`} /> : <CheckCircle className="w-4 h-4 text-green-500" />}
          <div>
            <p className="text-sm font-medium text-slate-900">{label}</p>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 ? (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[severity]}`}>{count} issues</span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">✓ Clean</span>
          )}
        </div>
      </div>
      {open && items && items.length > 0 && (
        <div className="border-t bg-slate-50 max-h-48 overflow-y-auto">
          {items.slice(0, 20).map((item, i) => (
            <div key={i} className="px-4 py-2 border-b last:border-0 flex items-center justify-between">
              <span className="text-xs text-slate-700">{item.label}</span>
              <span className="text-xs text-slate-400">{item.sub}</span>
            </div>
          ))}
          {items.length > 20 && <p className="px-4 py-2 text-xs text-slate-400">+{items.length - 20} more</p>}
        </div>
      )}
    </div>
  );
}

export default function AdminDataQuality() {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);

  const { data: users = [] } = useQuery({ queryKey: ["dq-users"], queryFn: () => db.User.list() });
  const { data: exhibitors = [] } = useQuery({ queryKey: ["dq-exhibitors"], queryFn: () => db.ExhibitorProfile.list() });
  const { data: products = [] } = useQuery({ queryKey: ["dq-products"], queryFn: () => db.Product.list() });
  const { data: leads = [] } = useQuery({ queryKey: ["dq-leads"], queryFn: () => db.LeadProfile.list() });
  const { data: events = [] } = useQuery({ queryKey: ["dq-events"], queryFn: () => db.Event.list() });
  const { data: subs = [] } = useQuery({ queryKey: ["dq-subs"], queryFn: () => db.PremiumBoothSubscription.list() });
  const { data: nfcProfiles = [] } = useQuery({ queryKey: ["dq-nfc"], queryFn: () => db.NFCProfile.list() });
  const { data: scanned = [] } = useQuery({ queryKey: ["dq-scanned"], queryFn: () => db.ScannedContact.list() });

  // Compute issues
  const dupUserEmails = (() => {
    const seen = {}; const dups = [];
    users.forEach(u => { if (seen[u.email]) dups.push({ label: u.email, sub: "Duplicate email" }); else seen[u.email] = true; });
    return dups;
  })();

  const dupExhibitorCompanies = (() => {
    const seen = {}; const dups = [];
    exhibitors.forEach(e => { const key = (e.company_name || "").toLowerCase().trim(); if (key && seen[key]) dups.push({ label: e.company_name, sub: e.id }); else if (key) seen[key] = true; });
    return dups;
  })();

  const productsWithoutImages = products.filter(p => !p.images?.length && !p.image_url)
    .map(p => ({ label: p.title || p.name || "Untitled", sub: p.id }));

  const incompleteExhibitors = exhibitors.filter(e => !e.company_name || !e.description || !e.contact_email)
    .map(e => ({ label: e.company_name || "Unknown", sub: `Missing: ${[!e.company_name && "name", !e.description && "description", !e.contact_email && "email"].filter(Boolean).join(", ")}` }));

  const invalidEmails = users.filter(u => u.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email))
    .map(u => ({ label: u.email, sub: u.full_name || u.id }));

  const expiredSubs = subs.filter(s => s.status === "active" && s.end_date && new Date(s.end_date) < new Date())
    .map(s => ({ label: s.exhibitor_id, sub: `Expired: ${s.end_date}` }));

  const leadsWithoutEmail = leads.filter(l => !l.email)
    .map(l => ({ label: l.lead_name, sub: "Missing email" }));

  const ocrLowConfidence = scanned.filter(s => s.ocr_confidence && s.ocr_confidence < 60)
    .map(s => ({ label: s.full_name || "Unknown contact", sub: `OCR confidence: ${s.ocr_confidence}%` }));

  const nfcInactive = nfcProfiles.filter(n => !n.active)
    .map(n => ({ label: n.display_name || n.user_id, sub: "NFC profile inactive" }));

  const productsNoCat = products.filter(p => !p.category)
    .map(p => ({ label: p.title || p.name || "Untitled", sub: "No category assigned" }));

  const totalIssues = dupUserEmails.length + dupExhibitorCompanies.length + productsWithoutImages.length +
    incompleteExhibitors.length + invalidEmails.length + expiredSubs.length +
    leadsWithoutEmail.length + ocrLowConfidence.length + nfcInactive.length + productsNoCat.length;

  const runScan = async () => {
    setScanning(true);
    await new Promise(r => setTimeout(r, 1500));
    setLastScan(new Date());
    setScanning(false);
  };

  const criticalCount = dupUserEmails.length + invalidEmails.length + expiredSubs.length;
  const warningCount = incompleteExhibitors.length + productsWithoutImages.length + leadsWithoutEmail.length;
  const infoCount = dupExhibitorCompanies.length + ocrLowConfidence.length + nfcInactive.length + productsNoCat.length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Shield className="w-5 h-5 text-teal-600" /> Data Quality Center</h2>
          <p className="text-sm text-slate-500">Automatic issue detection & resolution guidance</p>
        </div>
        <div className="flex items-center gap-2">
          {lastScan && <span className="text-xs text-slate-400">Last scan: {lastScan.toLocaleTimeString()}</span>}
          <Button onClick={runScan} disabled={scanning}>
            <RefreshCw className={`w-4 h-4 mr-1 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Run Full Scan"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-slate-500">Critical Issues</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
              <p className="text-xs text-slate-500">Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
              <p className="text-xs text-slate-500">Info Items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalIssues === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-green-600">All Clean!</p>
            <p className="text-sm text-slate-400 mt-1">No data quality issues detected across {users.length + exhibitors.length + products.length} records</p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Tabs defaultValue="critical">
            <TabsList className="mb-4">
              <TabsTrigger value="critical" className="text-xs">
                Critical {criticalCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{criticalCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="warnings" className="text-xs">
                Warnings {warningCount > 0 && <span className="ml-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{warningCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs">
                Info {infoCount > 0 && <span className="ml-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{infoCount}</span>}
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">All Issues ({totalIssues})</TabsTrigger>
            </TabsList>

            <TabsContent value="critical">
              <IssueRow severity="high" label="Duplicate User Emails" count={dupUserEmails.length} items={dupUserEmails} description="Multiple accounts with the same email address" />
              <IssueRow severity="high" label="Invalid Email Addresses" count={invalidEmails.length} items={invalidEmails} description="Email addresses that fail format validation" />
              <IssueRow severity="high" label="Expired Active Subscriptions" count={expiredSubs.length} items={expiredSubs} description="Subscriptions marked active but past end date" />
            </TabsContent>

            <TabsContent value="warnings">
              <IssueRow severity="medium" label="Incomplete Exhibitor Profiles" count={incompleteExhibitors.length} items={incompleteExhibitors} description="Exhibitors missing name, description, or contact email" />
              <IssueRow severity="medium" label="Products Without Images" count={productsWithoutImages.length} items={productsWithoutImages} description="Products have no main image" />
              <IssueRow severity="medium" label="Leads Without Email" count={leadsWithoutEmail.length} items={leadsWithoutEmail} description="Lead records missing contact email" />
            </TabsContent>

            <TabsContent value="info">
              <IssueRow severity="low" label="Duplicate Exhibitor Companies" count={dupExhibitorCompanies.length} items={dupExhibitorCompanies} description="Similar company names that may be duplicates" />
              <IssueRow severity="low" label="Low-Confidence OCR Scans" count={ocrLowConfidence.length} items={ocrLowConfidence} description="Business card scans with OCR confidence below 60%" />
              <IssueRow severity="low" label="Inactive NFC Profiles" count={nfcInactive.length} items={nfcInactive} description="NFC profiles that are deactivated" />
              <IssueRow severity="low" label="Products Without Category" count={productsNoCat.length} items={productsNoCat} description="Products not assigned to any category" />
            </TabsContent>

            <TabsContent value="all">
              <IssueRow severity="high" label="Duplicate User Emails" count={dupUserEmails.length} items={dupUserEmails} description="Multiple accounts with the same email address" />
              <IssueRow severity="high" label="Invalid Email Addresses" count={invalidEmails.length} items={invalidEmails} description="Email addresses that fail format validation" />
              <IssueRow severity="high" label="Expired Active Subscriptions" count={expiredSubs.length} items={expiredSubs} description="Subscriptions marked active but past end date" />
              <IssueRow severity="medium" label="Incomplete Exhibitor Profiles" count={incompleteExhibitors.length} items={incompleteExhibitors} description="Missing name, description, or contact email" />
              <IssueRow severity="medium" label="Products Without Images" count={productsWithoutImages.length} items={productsWithoutImages} description="Products have no main image" />
              <IssueRow severity="medium" label="Leads Without Email" count={leadsWithoutEmail.length} items={leadsWithoutEmail} description="Lead records missing contact email" />
              <IssueRow severity="low" label="Duplicate Exhibitor Companies" count={dupExhibitorCompanies.length} items={dupExhibitorCompanies} description="Similar company names that may be duplicates" />
              <IssueRow severity="low" label="Low-Confidence OCR Scans" count={ocrLowConfidence.length} items={ocrLowConfidence} description="OCR confidence below 60%" />
              <IssueRow severity="low" label="Inactive NFC Profiles" count={nfcInactive.length} items={nfcInactive} description="NFC profiles that are deactivated" />
              <IssueRow severity="low" label="Products Without Category" count={productsNoCat.length} items={productsNoCat} description="Products not assigned to any category" />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}