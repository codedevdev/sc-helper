/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UEX_API_BASE?: string;
  readonly VITE_UEX_API_TOKEN?: string;
  readonly VITE_UEX_USE_RUST_HTTP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
