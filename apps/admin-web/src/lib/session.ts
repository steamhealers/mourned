import { readonly, shallowRef } from 'vue'
import { createRequestSignature, decryptSensitiveFields, encryptSensitiveFields } from '@mourned/domain'
import { fallbackAdminSession, type AdminSession } from './access-model'
import { apiBaseUrl, demoAdminPassword, demoAdminUsername, requestSigningSecret, sm4Secret } from './config'

const storageKey = 'mourned-admin-session'

/**
 * 从本地存储恢复后台会话；读取失败或数据缺失时回退到预设演示会话。
 *
 * @returns {AdminSession} 当前可用的后台会话对象。
 */
function loadStoredSession() {
  try {
    const storedValue = window.localStorage.getItem(storageKey)

    if (!storedValue) {
      return fallbackAdminSession
    }

    return JSON.parse(storedValue) as AdminSession
  }
  catch {
    return fallbackAdminSession
  }
}

const currentAdminSession = shallowRef<AdminSession>(loadStoredSession())
let loginTask: Promise<AdminSession> | null = null

/**
 * 将后台会话持久化到本地存储，供页面刷新后继续复用。
 *
 * @param {AdminSession} session 需要持久化的后台会话。
 * @returns {void}
 */
function persistSession(session: AdminSession) {
  window.localStorage.setItem(storageKey, JSON.stringify(session))
}

/**
 * 生成后台请求通用鉴权头，包含客户端类型、时间戳、签名以及可选 JWT。
 *
 * @param {unknown} data 参与签名计算的请求数据。
 * @param {string} [authToken] 当前会话的 JWT；登录前请求可不传。
 * @returns {{ clienttype: string, timestamp: string, signature: string, authtoken?: string }} 后端验证所需的请求头集合。
 */
function buildSignedHeaders(data: unknown, authToken?: string) {
  const timestamp = String(Date.now())

  return {
    clienttype: 'admin-web',
    timestamp,
    signature: createRequestSignature({
      clientType: 'admin-web',
      timestamp,
      data,
      secret: requestSigningSecret,
    }),
    ...(authToken ? { authtoken: authToken } : {}),
  }
}

/**
 * 以只读方式暴露后台会话响应式引用，供界面订阅当前登录态。
 *
 * @returns {Readonly<typeof currentAdminSession>} 只读的后台会话引用。
 */
export function useAdminSession() {
  return readonly(currentAdminSession)
}

/**
 * 获取当前内存中的后台会话快照。
 *
 * @returns {AdminSession} 当前后台会话对象。
 */
export function getCurrentAdminSession() {
  return currentAdminSession.value
}

/**
 * 更新当前后台会话，并同步写入本地存储。
 *
 * @param {AdminSession} session 最新的后台会话对象。
 * @returns {void}
 */
export function setCurrentAdminSession(session: AdminSession) {
  currentAdminSession.value = session
  persistSession(session)
}

/**
 * 确保后台存在可用 JWT；若当前没有登录态，则自动触发一次静默登录。
 *
 * @returns {Promise<AdminSession>} 可直接用于后续请求的后台会话。
 */
export async function ensureAdminAuthenticated() {
  if (currentAdminSession.value.authToken) {
    return currentAdminSession.value
  }

  // 这里用单例 Promise 防止首屏并发请求时重复登录；
  // 否则页面初始化阶段多个接口同时触发，会打出多次 /auth/admin/login。
  if (loginTask) {
    return loginTask
  }

  loginTask = (async () => {
    // 登录请求本身也走同一套敏感字段加密协议，避免后台账号和演示密码以明文出现在传输层。
    const payload = encryptSensitiveFields({
      username: demoAdminUsername,
      password: demoAdminPassword,
    }, sm4Secret)

    const response = await fetch(`${apiBaseUrl}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildSignedHeaders(payload),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`ADMIN_LOGIN_FAILED:${response.status}`)
    }

    const rawData = await response.json() as { token: string, session: AdminSession }
    const data = decryptSensitiveFields(rawData, sm4Secret)
    const nextSession = {
      ...data.session,
      authToken: data.token,
    }

    // 会话对象落本地存储后，刷新页面仍能继续复用 JWT，直到 token 过期或被主动清理。
    setCurrentAdminSession(nextSession)
    loginTask = null
    return nextSession
    /**
     * 无论是网络错误还是接口错误，都要在这里重置 loginTask，
     * 防止后续重试时一直复用一个已经 reject 的 Promise。
     *
     * @param {unknown} error 静默登录过程中抛出的错误。
     * @returns {never} 继续向上抛出错误，由调用方决定如何处理。
     */
  })().catch((error) => {
    loginTask = null
    throw error
  })

  return loginTask
}

/**
 * 在确保后台已登录的前提下，生成带 authtoken 的请求头。
 *
 * @param {unknown} data 参与签名计算的请求数据。
 * @returns {Promise<{ clienttype: string, timestamp: string, signature: string, authtoken?: string }>} 完整的后台鉴权请求头。
 */
export async function buildAuthenticatedAdminHeaders(data: unknown) {
  const session = await ensureAdminAuthenticated()
  return buildSignedHeaders(data, session.authToken)
}
