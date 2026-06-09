import React from "react";
import { Nfc, Globe, Phone, Mail, Linkedin, MapPin } from "lucide-react";

export default function NFCProfileCard({ profile, user }) {
  const name = profile?.display_name || user?.full_name || "Your Name";
  const company = profile?.company || "";
  const position = profile?.position || "";
  const email = profile?.email || user?.email || "";
  const phone = profile?.phone || "";
  const booth = profile?.booth_number || "";
  const country = profile?.country || "";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-800 text-white p-5 shadow-lg">
      <div className="absolute top-3 right-3 opacity-20">
        <Nfc className="w-16 h-16" />
      </div>
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl font-bold shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold font-display truncate">{name}</h2>
          {position && <p className="text-sm text-white/80">{position}</p>}
          {company && <p className="text-sm font-semibold text-white/90">{company}</p>}
        </div>
      </div>
      <div className="mt-4 space-y-1.5">
        {email && (
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-xs text-white/80">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{phone}</span>
          </div>
        )}
        {country && (
          <div className="flex items-center gap-2 text-xs text-white/80">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{country}{booth ? ` · Booth ${booth}` : ""}</span>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
        <span className="text-[10px] text-white/50 font-mono">BoothBridge NFC</span>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>
    </div>
  );
}