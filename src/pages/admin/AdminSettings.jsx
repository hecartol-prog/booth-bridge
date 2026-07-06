import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Globe, Palette, Mail, Shield, Cpu, Save, Bell } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const LANGUAGES = ["English", "Chinese (Simplified)", "Arabic", "French", "German", "Spanish", "Portuguese", "Italian", "Russian", "Japanese", "Korean"];
const CURRENCIES = ["USD", "EUR", "GBP", "CNY", "JPY", "AED", "INR", "BRL", "CAD", "AUD"];
const TIMEZONES = ["UTC", "Asia/Shanghai", "America/New_York", "Europe/London", "America/Los_Angeles", "Asia/Dubai", "Asia/Tokyo"];

function SettingRow({ label, description = undefined, children }) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="ml-4 shrink-0">{children}</div>
    </div>
  );
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    platform_name: "BoothBridge",
    support_email: "support@boothbridge.com",
    default_language: "English",
    default_currency: "USD",
    default_timezone: "Asia/Shanghai",
    nfc_enabled: true,
    ocr_enabled: true,
    ai_scoring_enabled: true,
    email_notifications: true,
    maintenance_mode: false,
    registration_open: true,
    auto_approve_exhibitors: false,
    require_verification: true,
    max_file_size_mb: 50,
    session_timeout_mins: 60,
  });

  const save = () => {
    localStorage.setItem("bb_admin_settings", JSON.stringify(settings));
    toast({ title: "Settings saved", description: "Platform settings updated successfully" });
  };

  const upd = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-600" /> System Settings</h2>
          <p className="text-sm text-slate-500">Platform-wide configuration</p>
        </div>
        <Button onClick={save}><Save className="w-4 h-4 mr-1" /> Save All Settings</Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="text-xs"><Globe className="w-3 h-3 mr-1" /> General</TabsTrigger>
          <TabsTrigger value="branding" className="text-xs"><Palette className="w-3 h-3 mr-1" /> Branding</TabsTrigger>
          <TabsTrigger value="email" className="text-xs"><Mail className="w-3 h-3 mr-1" /> Email</TabsTrigger>
          <TabsTrigger value="security" className="text-xs"><Shield className="w-3 h-3 mr-1" /> Security</TabsTrigger>
          <TabsTrigger value="features" className="text-xs"><Cpu className="w-3 h-3 mr-1" /> Features</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs"><Bell className="w-3 h-3 mr-1" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">General Settings</CardTitle></CardHeader>
            <CardContent>
              <SettingRow label="Platform Name" description="Displayed in emails and UI">
                <Input value={settings.platform_name} onChange={e => upd("platform_name", e.target.value)} className="w-48" />
              </SettingRow>
              <SettingRow label="Support Email" description="Contact email shown to users">
                <Input value={settings.support_email} onChange={e => upd("support_email", e.target.value)} className="w-56" />
              </SettingRow>
              <SettingRow label="Default Language">
                <Select value={settings.default_language} onValueChange={v => upd("default_language", v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Default Currency">
                <Select value={settings.default_currency} onValueChange={v => upd("default_currency", v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Default Timezone">
                <Select value={settings.default_timezone} onValueChange={v => upd("default_timezone", v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMEZONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Max File Upload Size (MB)">
                <Input type="number" value={settings.max_file_size_mb} onChange={e => upd("max_file_size_mb", Number(e.target.value))} className="w-24" />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Branding & Appearance</CardTitle></CardHeader>
            <CardContent>
              <SettingRow label="Logo URL" description="Platform logo shown in header">
                <Input placeholder="https://..." className="w-64" />
              </SettingRow>
              <SettingRow label="Primary Color" description="Main brand color">
                <Input type="color" defaultValue="#1a3fb5" className="w-16 h-9 p-1 rounded cursor-pointer" />
              </SettingRow>
              <SettingRow label="Favicon URL" description="Browser tab icon">
                <Input placeholder="https://..." className="w-64" />
              </SettingRow>
              <SettingRow label="App Store URL">
                <Input placeholder="https://apps.apple.com/..." className="w-64" />
              </SettingRow>
              <SettingRow label="Play Store URL">
                <Input placeholder="https://play.google.com/..." className="w-64" />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Email Configuration</CardTitle></CardHeader>
            <CardContent>
              <SettingRow label="From Email" description="Sender address for system emails">
                <Input placeholder="noreply@boothbridge.com" className="w-64" />
              </SettingRow>
              <SettingRow label="From Name">
                <Input placeholder="BoothBridge" className="w-48" />
              </SettingRow>
              <SettingRow label="Reply-To Email">
                <Input placeholder="support@boothbridge.com" className="w-64" />
              </SettingRow>
              <SettingRow label="Email Notifications" description="Send system email notifications">
                <Switch checked={settings.email_notifications} onCheckedChange={v => upd("email_notifications", v)} />
              </SettingRow>
              <div className="pt-4">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Email Templates</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Welcome Email", "Meeting Request", "Lead Notification", "RFI Response", "Password Reset", "Subscription Confirmation"].map(t => (
                    <Button key={t} variant="outline" size="sm" className="text-xs justify-start">{t}</Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Security Settings</CardTitle></CardHeader>
            <CardContent>
              <SettingRow label="Maintenance Mode" description="Disable access for all non-admin users">
                <div className="flex items-center gap-2">
                  {settings.maintenance_mode && <Badge className="bg-red-100 text-red-700 text-xs">Active</Badge>}
                  <Switch checked={settings.maintenance_mode} onCheckedChange={v => upd("maintenance_mode", v)} />
                </div>
              </SettingRow>
              <SettingRow label="Open Registration" description="Allow new user signups">
                <Switch checked={settings.registration_open} onCheckedChange={v => upd("registration_open", v)} />
              </SettingRow>
              <SettingRow label="Require Email Verification" description="Verify email before accessing platform">
                <Switch checked={settings.require_verification} onCheckedChange={v => upd("require_verification", v)} />
              </SettingRow>
              <SettingRow label="Auto-Approve Exhibitors" description="Skip manual review for new exhibitors">
                <Switch checked={settings.auto_approve_exhibitors} onCheckedChange={v => upd("auto_approve_exhibitors", v)} />
              </SettingRow>
              <SettingRow label="Session Timeout (minutes)">
                <Input type="number" value={settings.session_timeout_mins} onChange={e => upd("session_timeout_mins", Number(e.target.value))} className="w-24" />
              </SettingRow>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Feature Toggles</CardTitle></CardHeader>
            <CardContent>
              {[
                ["nfc_enabled", "NFC Exchange", "Enable NFC badge & product tap features"],
                ["ocr_enabled", "OCR Scanner", "Business card & badge scanning with OCR"],
                ["ai_scoring_enabled", "AI Lead Scoring", "Automatically score and rank leads"],
              ].map(([key, label, desc]) => (
                <SettingRow key={key} label={label} description={desc}>
                  <div className="flex items-center gap-2">
                    <Badge className={settings[key] ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}>
                      {settings[key] ? "Enabled" : "Disabled"}
                    </Badge>
                    <Switch checked={settings[key]} onCheckedChange={v => upd(key, v)} />
                  </div>
                </SettingRow>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notification Settings</CardTitle></CardHeader>
            <CardContent>
              {[
                ["Meeting Request Received", "Notify exhibitor when meeting is requested"],
                ["New Lead Captured", "Notify exhibitor when lead is recorded"],
                ["RFI Submitted", "Notify exhibitor on new RFI"],
                ["Subscription Renewal", "Remind users before subscription expires"],
                ["New User Registered", "Notify admins on new signups"],
                ["NFC Tap Event", "Notify on NFC badge interactions"],
              ].map(([label, desc]) => (
                <SettingRow key={label} label={label} description={desc}>
                  <Switch defaultChecked />
                </SettingRow>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}