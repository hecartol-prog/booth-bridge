/// <reference types="vite/client" />

declare const __BB_BUILD_INFO__: {
  version: string;
  commit: string;
  timestamp: string;
};

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_AI_ENABLED?: string;
  readonly VITE_DEBUG_MODE?: string;
  readonly VITE_DISABLE_DEBUG_CONSOLE?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_RC10_VISION_MODEL?: string;
  readonly VITE_RC10_NORMALIZE_MODEL?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
