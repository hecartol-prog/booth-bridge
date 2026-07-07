import React from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const LOGO = "https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png";

export default function AuthLayout({
  icon: Icon,
  title,
  subtitle,
  footer = null,
  children,
  onLogoClick = undefined,
  adminLinkVisible = false,
}) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-start sm:justify-center py-10 px-4">
      {/* Language switcher top-right */}
      <div className="absolute top-4 right-4">
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <LanguageSwitcher />
        </div>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={onLogoClick}
            className="mx-auto mb-4 block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            aria-label="BoothBridge logo"
          >
            <img
              src={LOGO}
              alt="Booth Bridge"
              className="w-16 h-16 rounded-2xl object-cover cursor-pointer select-none"
              draggable={false}
            />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6 pb-4">{footer}</p>
        )}
        {adminLinkVisible && (
          <div className="text-center mt-3">
            <a
              href="/admin-login"
              className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              HCT
            </a>
          </div>
        )}
      </div>
    </div>
  );
}