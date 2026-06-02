/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_OUTLET_ID: string;
  readonly VITE_SCREEN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
