/// <reference types="vite/client" />

// Injected at build time by vite.config.ts define block
declare const __BUILD_TS__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_SECRET: string;
  readonly VITE_ENABLE_STREAMING: string;
  readonly VITE_ENABLE_MOCK_DATA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
