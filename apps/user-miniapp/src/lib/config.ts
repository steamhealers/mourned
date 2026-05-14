const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000'
const DEFAULT_DEMO_OPEN_ID = 'user-demo-001'
const DEFAULT_REQUEST_SIGNING_SECRET = 'mourned-user-sign-2026'
const DEFAULT_SM4_SECRET = '0123456789abcdeffedcba9876543210'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
export const demoOpenId = import.meta.env.VITE_DEMO_OPEN_ID ?? DEFAULT_DEMO_OPEN_ID
export const requestSigningSecret = import.meta.env.VITE_REQUEST_SIGNING_SECRET ?? DEFAULT_REQUEST_SIGNING_SECRET
export const sm4Secret = import.meta.env.VITE_SM4_SECRET ?? DEFAULT_SM4_SECRET
