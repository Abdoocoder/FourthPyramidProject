// Vite injects import.meta.env at build time.
// This declaration teaches TypeScript about it.

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL:    string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_NAME?:       string;
  readonly VITE_APP_URL?:        string;
  [key: string]: string | undefined;
}
