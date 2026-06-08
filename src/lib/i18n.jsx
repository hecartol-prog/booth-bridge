import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

import en from "../locales/en.json";
import es from "../locales/es.json";
import zh from "../locales/zh.json";
import fr from "../locales/fr.json";
import de from "../locales/de.json";
import pt from "../locales/pt.json";
import it from "../locales/it.json";
import ru from "../locales/ru.json";

const TRANSLATIONS = { en, es, zh, fr, de, pt, it, ru };

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",    flag: "🇬🇧" },
  { code: "es", label: "Español",    flag: "🇪🇸" },
  { code: "zh", label: "中文",        flag: "🇨🇳" },
  { code: "fr", label: "Français",   flag: "🇫🇷" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪" },
  { code: "pt", label: "Português",  flag: "🇧🇷" },
  { code: "it", label: "Italiano",   flag: "🇮🇹" },
  { code: "ru", label: "Русский",    flag: "🇷🇺" },
];

const RTL_LANGUAGES = ["ar", "he", "fa", "ur"];

function detectBrowserLanguage() {
  const nav = navigator.language || navigator.userLanguage || "en";
  const code = nav.split("-")[0].toLowerCase();
  return TRANSLATIONS[code] ? code : "en";
}

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem("bb_language");
    if (stored && TRANSLATIONS[stored]) return stored;
  } catch (_) {}
  return detectBrowserLanguage();
}

// Nested key lookup: t("nav.dashboard") → translations.nav.dashboard
function lookup(obj, key, fallback) {
  const parts = key.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return fallback;
    cur = cur[part];
  }
  return cur != null ? String(cur) : fallback;
}

// Interpolate {name}, {count} style placeholders
function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((code) => {
    if (!TRANSLATIONS[code]) return;
    setLanguageState(code);
    try { localStorage.setItem("bb_language", code); } catch (_) {}
  }, []);

  const t = useCallback((key, params) => {
    const primary = lookup(TRANSLATIONS[language], key, null);
    if (primary != null) return interpolate(primary, params);
    // Fallback to English
    const fallback = lookup(TRANSLATIONS.en, key, key);
    return interpolate(fallback, params);
  }, [language]);

  // RTL support — future-ready
  const isRTL = RTL_LANGUAGES.includes(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
  }, [language, isRTL]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, isRTL, SUPPORTED_LANGUAGES }}>
      {children}
    </I18nContext.Provider>
  );
}

const FALLBACK_I18N = {
  language: "en",
  setLanguage: () => {},
  t: (key) => lookup(TRANSLATIONS.en, key, key),
  isRTL: false,
  SUPPORTED_LANGUAGES,
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  return ctx || FALLBACK_I18N;
}