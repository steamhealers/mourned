const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3000'
const DEFAULT_DEMO_WORKER_PROFILE_ID = 1
const DEFAULT_REQUEST_SIGNING_SECRET = 'mourned-worker-sign-2026'
const DEFAULT_SM4_SECRET = '89abcdeffedcba987654321001234567'

/**
 * 解析环境变量中的演示代办员 id；非法值时回退到默认值。
 *
 * @param {string | undefined} value 环境变量原始值。
 * @returns {number} 有效的代办员档案 id。
 */
function parseWorkerProfileId(value: string | undefined) {
  const parsedValue = Number(value)

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue
  }

  return DEFAULT_DEMO_WORKER_PROFILE_ID
}

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL
export const demoWorkerProfileId = parseWorkerProfileId(import.meta.env.VITE_DEMO_WORKER_PROFILE_ID)
export const requestSigningSecret = import.meta.env.VITE_REQUEST_SIGNING_SECRET ?? DEFAULT_REQUEST_SIGNING_SECRET
export const sm4Secret = import.meta.env.VITE_SM4_SECRET ?? DEFAULT_SM4_SECRET
