import { readonly, shallowRef } from 'vue'
import { createRequestSignature } from '@mourned/domain'
import { apiBaseUrl, demoWorkerProfileId, requestSigningSecret } from './config'

export interface WorkerSession {
  authMode: 'demo' | 'wechat'
  workerProfileId: number
  authToken?: string
}

const storageKey = 'mourned-worker-session'

/**
 * 从本地缓存恢复代办员端会话；若缓存无效，则回退到演示 worker id。
 *
 * @returns {WorkerSession} 当前可用的代办员端会话对象。
 */
function loadStoredSession(): WorkerSession {
  const storedValue = uni.getStorageSync(storageKey)

  if (storedValue && typeof storedValue === 'object' && typeof storedValue.workerProfileId === 'number') {
    return storedValue as WorkerSession
  }

  return {
    authMode: 'demo',
    workerProfileId: demoWorkerProfileId,
  }
}

const currentWorkerSession = shallowRef<WorkerSession>(loadStoredSession())
let loginTask: Promise<WorkerSession> | null = null

/**
 * 将代办员端会话写入本地缓存，便于小程序重启后继续复用。
 *
 * @param {WorkerSession} session 需要持久化的会话对象。
 * @returns {void}
 */
function persistSession(session: WorkerSession) {
  uni.setStorageSync(storageKey, session)
}

/**
 * 构建代办员端请求头，统一附带客户端类型、时间戳、签名和可选 JWT。
 *
 * @param {unknown} data 参与签名的请求数据。
 * @param {string} [authToken] 当前会话的访问令牌。
 * @returns {{ clienttype: string, timestamp: string, signature: string, authtoken?: string }} 发给 API 的鉴权请求头。
 */
function buildSignedHeaders(data: unknown, authToken?: string) {
  const timestamp = String(Date.now())

  return {
    clienttype: 'worker-miniapp',
    timestamp,
    signature: createRequestSignature({
      clientType: 'worker-miniapp',
      timestamp,
      data,
      secret: requestSigningSecret,
    }),
    ...(authToken ? { authtoken: authToken } : {}),
  }
}

/**
 * 以只读形式暴露代办员端会话响应式引用。
 *
 * @returns {Readonly<typeof currentWorkerSession>} 只读会话引用。
 */
export function useWorkerSession() {
  return readonly(currentWorkerSession)
}

/**
 * 获取当前内存中的代办员端会话快照。
 *
 * @returns {WorkerSession} 当前会话对象。
 */
export function getCurrentWorkerSession() {
  return currentWorkerSession.value
}

/**
 * 更新当前代办员端会话，并同步写入缓存。
 *
 * @param {WorkerSession} session 最新的会话对象。
 * @returns {void}
 */
export function setCurrentWorkerSession(session: WorkerSession) {
  currentWorkerSession.value = session
  persistSession(session)
}

/**
 * 确保代办员端已经拿到可用 JWT；如果没有，则发起一次静默登录。
 *
 * @returns {Promise<WorkerSession>} 含有效访问令牌的会话对象。
 */
export async function ensureWorkerAuthenticated() {
  if (currentWorkerSession.value.authToken) {
    return currentWorkerSession.value
  }

  if (loginTask) {
    return loginTask
  }

  loginTask = new Promise<WorkerSession>((resolve, reject) => {
    const payload = {
      workerProfileId: currentWorkerSession.value.workerProfileId,
    }

    uni.request({
      url: `${apiBaseUrl}/auth/worker/login`,
      method: 'POST',
      data: payload,
      header: buildSignedHeaders(payload),
      /**
       * 校验登录响应并把 token 合并进代办员端会话对象。
       *
       * @param {UniApp.RequestSuccessCallbackResult} response 登录接口响应。
       * @returns {void}
       */
      success: (response: UniApp.RequestSuccessCallbackResult) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`WORKER_LOGIN_FAILED:${response.statusCode}`))
          return
        }

        const responseData = response.data as { token: string, session: Omit<WorkerSession, 'authToken'> }
        const nextSession = {
          ...responseData.session,
          authToken: responseData.token,
        }

        setCurrentWorkerSession(nextSession)
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
 * 在确保已登录的前提下，生成带 authtoken 的代办员端请求头。
 *
 * @param {unknown} data 参与签名的请求数据。
 * @returns {Promise<{ clienttype: string, timestamp: string, signature: string, authtoken?: string }>} 完整鉴权请求头。
 */
export async function buildAuthenticatedWorkerHeaders(data: unknown) {
  const session = await ensureWorkerAuthenticated()
  return buildSignedHeaders(data, session.authToken)
}
