interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEMO_ADMIN_USERNAME?: string
  readonly VITE_DEMO_ADMIN_PASSWORD?: string
  readonly VITE_REQUEST_SIGNING_SECRET?: string
  readonly VITE_SM4_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}