import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

import en from "../locales/en.json";

/** English is always available (fallback). Other locales load on demand. */
const localeCache = { en };

const LOCALE_LOADERS = {
  es: () => import("../locales/es.json"),
  zh: () => import("../locales/zh.json"),
  fr: () => import("../locales/fr.json"),
  de: () => import("../locales/de.json"),
  pt: () => import("../locales/pt.json"),
  it: () => import("../locales/it.json"),
  ru: () => import("../locales/ru.json"),
};

const SUPPORTED_CODES = new Set(["en", ...Object.keys(LOCALE_LOADERS)]);

async function loadLocale(code) {
  if (localeCache[code]) return localeCache[code];
  const loader = LOCALE_LOADERS[code];
  if (!loader) return localeCache.en;
  const mod = await loader();
  const data = mod.default ?? mod;
  localeCache[code] = data;
  return data;
}

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
  return SUPPORTED_CODES.has(code) ? code : "en";
}

function getInitialLanguage() {
  try {
    const stored = localStorage.getItem("bb_language");
    if (stored && SUPPORTED_CODES.has(stored)) return stored;
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
  // Bumps when a locale finishes loading so `t` re-binds to the new dictionary.
  const [localeVersion, setLocaleVersion] = useState(0);
  const loadGen = useRef(0);

  // Preload detected/stored non-English locale on mount (and whenever language changes).
  useEffect(() => {
    if (language === "en" || localeCache[language]) return undefined;
    const gen = ++loadGen.current;
    loadLocale(language).then(() => {
      if (gen === loadGen.current) setLocaleVersion((v) => v + 1);
    });
    return undefined;
  }, [language]);

  const setLanguage = useCallback((code) => {
    if (!SUPPORTED_CODES.has(code)) return;
    const apply = () => {
      setLanguageState(code);
      try { localStorage.setItem("bb_language", code); } catch (_) {}
    };
    if (code === "en" || localeCache[code]) {
      apply();
      return;
    }
    const gen = ++loadGen.current;
    loadLocale(code).then(() => {
      if (gen !== loadGen.current) return;
      setLocaleVersion((v) => v + 1);
      apply();
    });
  }, []);

  const t = useCallback((key, params) => {
    const dict = localeCache[language] || localeCache.en;
    const primary = lookup(dict, key, null);
    if (primary != null) return interpolate(primary, params);
    // Fallback to English
    const fallback = lookup(localeCache.en, key, key);
    return interpolate(fallback, params);
  }, [language, localeVersion]);

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
  t: (key) => lookup(localeCache.en, key, key),
  isRTL: false,
  SUPPORTED_LANGUAGES,
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  return ctx || FALLBACK_I18N;
}
