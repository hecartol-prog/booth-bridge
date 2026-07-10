/**
 * RC10.5 — Floating developer debug console.
 */

import { useCallback, useEffect, useState } from "react";
import { Bug, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DebugProvider } from "@/debug/DebugProvider";
import {
  AppInfoSection,
  AdminAccessSection,
  AuthSection,
  SupabaseSection,
  AiSection,
  OcrSection,
  ApiSection,
  StorageSection,
  DatabaseSection,
  PerformanceSection,
  ErrorsSection,
  FeatureFlagsSection,
  LogsSection,
  PlaywrightSection,
  ExportSection,
} from "@/debug/sections";

const SECTIONS = [
  { id: "admin", label: "Admin", component: AdminAccessSection },
  { id: "app", label: "App", component: AppInfoSection },
  { id: "auth", label: "Auth", component: AuthSection },
  { id: "supabase", label: "Supabase", component: SupabaseSection },
  { id: "ai", label: "AI", component: AiSection },
  { id: "ocr", label: "OCR", component: OcrSection },
  { id: "api", label: "API", component: ApiSection },
  { id: "storage", label: "Storage", component: StorageSection },
  { id: "database", label: "Database", component: DatabaseSection },
  { id: "performance", label: "Perf", component: PerformanceSection },
  { id: "errors", label: "Errors", component: ErrorsSection },
  { id: "flags", label: "Flags", component: FeatureFlagsSection },
  { id: "logs", label: "Logs", component: LogsSection },
  { id: "playwright", label: "E2E", component: PlaywrightSection },
  { id: "export", label: "Export", component: ExportSection },
];

const STORAGE_KEY = "bb_debug_console";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function DebugConsoleInner({ access }) {
  const prefs = loadPrefs();
  const [expanded, setExpanded] = useState(prefs.expanded ?? false);
  const [activeSection, setActiveSection] = useState(prefs.section ?? "admin");
  const [size, setSize] = useState({
    width: prefs.width ?? 420,
    height: prefs.height ?? 520,
  });

  const toggle = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      savePrefs({ ...loadPrefs(), expanded: next });
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  const ActiveComponent =
    SECTIONS.find((s) => s.id === activeSection)?.component ?? AppInfoSection;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-4 right-4 z-[99999] flex items-center gap-2 rounded-full border border-violet-500/40 bg-slate-950/95 px-3 py-2 text-xs font-medium text-violet-300 shadow-lg backdrop-blur hover:bg-slate-900"
        title="Debug Console (Ctrl+Shift+D)"
        aria-label="Open debug console"
      >
        <Bug className="h-4 w-4" />
        Debug
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[99999] flex flex-col overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/98 shadow-2xl backdrop-blur"
      style={{
        width: size.width,
        height: size.height,
        resize: "both",
        minWidth: 320,
        minHeight: 280,
        maxWidth: "95vw",
        maxHeight: "90vh",
      }}
      onMouseUp={() => {
        const el = document.querySelector("[data-bb-debug-panel]");
        if (el instanceof HTMLElement) {
          const next = { width: el.offsetWidth, height: el.offsetHeight };
          setSize(next);
          savePrefs({ ...loadPrefs(), ...next });
        }
      }}
      data-bb-debug-panel
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-300">
          <Bug className="h-4 w-4" />
          BoothBridge Debug
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Collapse debug console"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              savePrefs({ ...loadPrefs(), expanded: false });
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close debug console"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-24 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <ScrollArea className="h-full">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveSection(s.id);
                  savePrefs({ ...loadPrefs(), section: s.id });
                }}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-[10px] font-medium transition-colors",
                  activeSection === s.id
                    ? "bg-violet-600/30 text-violet-200"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                {s.label}
              </button>
            ))}
          </ScrollArea>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-slate-800 px-3 py-1.5 text-[10px] text-slate-500">
            Ctrl+Shift+D · Supabase admin session required
          </div>
          <ScrollArea className="flex-1 p-3">
            <ActiveComponent access={access} />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

export default function DebugConsole({ access }) {
  return (
    <DebugProvider>
      <DebugConsoleInner access={access} />
    </DebugProvider>
  );
}
