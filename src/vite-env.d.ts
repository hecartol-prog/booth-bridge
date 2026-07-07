/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_DATA_BACKEND?: "base44" | "supabase";
  readonly VITE_AI_ENABLED?: string;
  readonly VITE_BASE44_APP_ID?: string;
  readonly VITE_BASE44_FUNCTIONS_VERSION?: string;
  readonly VITE_BASE44_APP_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
