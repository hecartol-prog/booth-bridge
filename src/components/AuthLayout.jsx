import React from "react";

const LOGO = "https://media.base44.com/images/public/6a1efdb97246f738e8422e59/5b248dbd5_logoBB-removebg-preview.png";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-start sm:justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={LOGO}
            alt="Booth Bridge"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4"
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 sm:p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6 pb-4">{footer}</p>
        )}
      </div>
    </div>
  );
}