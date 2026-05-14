import { readonly, shallowRef } from 'vue'
import { createRequestSignature } from '@mourned/domain'
import { apiBaseUrl, demoOpenId, requestSigningSecret } from './config'

export interface UserSession {
  authMode: 'demo' | 'wechat'
  openId: string
  authToken?: string
}

const storageKey = 'mourned-user-session'

/**
 * 从本地缓存恢复用户端会话；若缓存无效，则回退到演示 openId。
 *
 * @returns {UserSession} 当前可用的用户端会话对象。
 */
function loadStoredSession(): UserSession {
  const storedValue = uni.getStorageSync(storageKey)

  if (storedValue && typeof storedValue === 'object' && typeof storedValue.openId === 'string') {
    return storedValue as UserSession
  }

  return {
    authMode: 'demo',
    openId: demoOpenId,
  }
}

const currentUserSession = shallowRef<UserSession>(loadStoredSession())
let loginTask: Promise<UserSession> | null = null

/**
 * 将用户端会话写入本地缓存，便于小程序重启后继续复用。
 *
 * @param {UserSession} session 需要持久化的会话对象。
 * @returns {void}
 */
function persistSession(session: UserSession) {
  uni.setStorageSync(storageKey, session)
}

/**
 * 构建用户端请求头，统一附带客户端类型、时间戳、签名和可选 JWT。
 *
 * @param {unknown} data 参与签名的请求数据。
 * @param {string} [authToken] 当前会话的访问令牌。
 * @returns {{ clienttype: string, timestamp: string, signature: string, authtoken?: string }} 发给 API 的鉴权请求头。
 */
function buildSignedHeaders(data: unknown, authToken?: string) {
  const timestamp = String(Date.now())

  return {
    clienttype: 'user-miniapp',
    timestamp,
    signature: createRequestSignature({
      clientType: 'user-miniapp',
      timestamp,
      data,
      secret: requestSigningSecret,
    }),
    ...(authToken ? { authtoken: authToken } : {}),
  }
}

/**
 * 以只读形式暴露用户端会话响应式引用。
 *
 * @returns {Readonly<typeof currentUserSession>} 只读会话引用。
 */
export function useUserSession() {
  return readonly(currentUserSession)
}

/**
 * 获取当前内存中的用户端会话快照。
 *
 * @returns {UserSession} 当前会话对象。
 */
export function getCurrentUserSession() {
  return currentUserSession.value
}

/**
 * 更新当前用户端会话，并同步写入缓存。
 *
 * @param {UserSession} session 最新的会话对象。
 * @returns {void}
 */
export function setCurrentUserSession(session: UserSession) {
  currentUserSession.value = session
  persistSession(session)
}

/**
 * 确保用户端已经拿到可用 JWT；如果没有，则发起一次静默登录。
 *
 * @returns {Promise<UserSession>} 含有效访问令牌的会话对象。
 */
export async function ensureUserAuthenticated() {
  if (currentUserSession.value.authToken) {
    return currentUserSession.value
  }

  if (loginTask) {
    return loginTask
  }

  loginTask = new Promise<UserSession>((resolve, reject) => {
    const payload = {
      openId: currentUserSession.value.openId,
    }

    uni.request({
      url: `${apiBaseUrl}/auth/user/login`,
      method: 'POST',
      data: payload,
      header: buildSignedHeaders(payload),
      /**
       * 校验登录响应并把 token 合并进会话对象。
       *
       * @param {UniApp.RequestSuccessCallbackResult} response 登录接口响应。
       * @returns {void}
       */
      success: (response: UniApp.RequestSuccessCallbackResult) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`USER_LOGIN_FAILED:${response.statusCode}`))
          return
        }

        const responseData = response.data as { token: string, session: Omit<UserSession, 'authToken'> }
        const nextSession = {
          ...responseData.session,
          authToken: responseData.token,
        }

        setCurrentUserSession(nextSession)
        resolve(nextSession)
      },
      /**
       * 将 uni.request 的底层失败直接透传给外层 Promise。
       *
       * @param {unknown} error 请求失败时的错误对象。
       * @returns {void}
       */
      fail: reject,
      /**
       * 无论登录成功还是失败，都重置 loginTask，允许后续重新发起静默登录。
       *
       * @returns {void}
       */
      complete: () => {
        loginTask = null
      },
    })
  })

  return loginTask
}

/**
 * 在确保已登录的前提下，生成带 authtoken 的用户端请求头。
 *
 * @param {unknown} data 参与签名的请求数据。
 * @returns {Promise<{ clienttype: string, timestamp: string, signature: string, authtoken?: string }>} 完整鉴权请求头。
 */
export async function buildAuthenticatedUserHeaders(data: unknown) {
  const session = await ensureUserAuthenticated()
  return buildSignedHeaders(data, session.authToken)
}
