/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STAFF_LOGIN_URL?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
