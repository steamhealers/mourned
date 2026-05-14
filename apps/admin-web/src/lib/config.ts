const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000'
const DEFAULT_DEMO_ADMIN_USERNAME = 'admin-demo-001'
const DEFAULT_DEMO_ADMIN_PASSWORD = 'demo-only'
const DEFAULT_REQUEST_SIGNING_SECRET = 'mourned-admin-sign-2026'
const DEFAULT_SM4_SECRET = 'fedcba98765432100123456789abcdef'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
export const demoAdminUsername = import.meta.env.VITE_DEMO_ADMIN_USERNAME ?? DEFAULT_DEMO_ADMIN_USERNAME
export const demoAdminPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD ?? DEFAULT_DEMO_ADMIN_PASSWORD
export const requestSigningSecret = import.meta.env.VITE_REQUEST_SIGNING_SECRET ?? DEFAULT_REQUEST_SIGNING_SECRET
export const sm4Secret = import.meta.env.VITE_SM4_SECRET ?? DEFAULT_SM4_SECRET