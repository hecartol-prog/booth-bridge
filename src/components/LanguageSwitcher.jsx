import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

const VARIANT_STYLES = {
  default: "text-foreground hover:text-foreground hover:bg-muted",
  sidebar: "w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
};

const PLACEMENT_STYLES = {
  bottom: "absolute top-full left-0 mt-1",
  top: "absolute bottom-full left-0 mb-1",
};

export default function LanguageSwitcher({
  compact = false,
  variant = "default",
  placement = "bottom",
}) {
  const { language, setLanguage, SUPPORTED_LANGUAGES } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buttonSize = compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm";
  const sidebarLayout = variant === "sidebar" ? "gap-3" : "gap-1.5";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className={`flex items-center rounded-lg transition-colors ${VARIANT_STYLES[variant]} ${buttonSize} ${sidebarLayout}`}
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span className="font-medium uppercase">{current.code}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className={`${PLACEMENT_STYLES[placement]} z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px] py-1 max-h-[min(320px,70vh)] overflow-y-auto`}
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={language === lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                language === lang.code
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.label}</span>
              {language === lang.code && (
                <span className="ml-auto text-primary text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
