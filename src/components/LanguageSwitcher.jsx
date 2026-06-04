import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";

export default function LanguageSwitcher({ compact = false }) {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        className={`flex items-center gap-1.5 rounded-lg transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${
          compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span className="font-medium uppercase">{current.code}</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className="absolute bottom-full left-0 mb-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px] py-1"
        >
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
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