import { createRequestSignature, decryptSensitiveFields, encryptSensitiveFields, type ClientType } from '@mourned/domain'
import type { FastifyReply, FastifyRequest } from 'fastify'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '../config/env'
import type { AuthContext } from '../types/fastify'

const clientTypeSchema = z.enum(['user-miniapp', 'worker-miniapp', 'admin-web'])

const authTokenPayloadSchema = z.object({
  clientType: clientTypeSchema,
  subjectType: z.enum(['user', 'worker', 'admin']),
  subjectId: z.string().min(1),
  openId: z.string().optional(),
  workerProfileId: z.number().int().positive().optional(),
  adminUserId: z.number().int().positive().optional(),
  adminUsername: z.string().optional(),
  roleCodes: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
})

/**
 * 提取不带查询参数的请求路径，确保鉴权分支判断只依赖真实路由。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @returns {string} 去掉 query string 之后的路径。
 */
function getPathname(request: FastifyRequest) {
  return request.url.split('?')[0]
}

/**
 * 判断当前请求是否应跳过签名校验。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @returns {boolean} 为 true 时表示该请求无需执行签名验证。
 */
function shouldSkipSignatureValidation(request: FastifyRequest) {
  const pathname = getPathname(request)
  return request.method === 'OPTIONS' || pathname === '/health' || pathname.startsWith('/files/')
}

/**
 * 判断当前请求是否应跳过 JWT 校验。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @returns {boolean} 为 true 时表示该请求不强制要求 authtoken。
 */
function shouldSkipJwtValidation(request: FastifyRequest) {
  const pathname = getPathname(request)
  return shouldSkipSignatureValidation(request) || pathname.startsWith('/auth/')
}

/**
 * 根据客户端类型选择对应的请求签名密钥。
 *
 * @param {ClientType} clientType 发起请求的客户端类型。
 * @returns {string} 当前客户端应使用的 HMAC 签名密钥。
 */
function getSigningSecret(clientType: ClientType) {
  switch (clientType) {
    case 'user-miniapp':
      return env.USER_MINIAPP_SIGNING_SECRET
    case 'worker-miniapp':
      return env.WORKER_MINIAPP_SIGNING_SECRET
    case 'admin-web':
      return env.ADMIN_WEB_SIGNING_SECRET
  }
}

/**
 * 根据客户端类型选择对应的 SM4 传输加解密密钥。
 *
 * @param {ClientType} clientType 发起请求的客户端类型。
 * @returns {string} 当前客户端应使用的 SM4 密钥。
 */
function getSm4Secret(clientType: ClientType) {
  switch (clientType) {
    case 'user-miniapp':
      return env.USER_MINIAPP_SM4_SECRET
    case 'worker-miniapp':
      return env.WORKER_MINIAPP_SM4_SECRET
    case 'admin-web':
      return env.ADMIN_WEB_SM4_SECRET
  }
}

/**
 * 统一读取请求头的字符串值，兼容 Fastify 中 string 与 string[] 两种形态。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {string} headerName 需要读取的请求头名称。
 * @returns {string} 归一化后的请求头值；不存在时返回空字符串。
 */
function getHeaderValue(request: FastifyRequest, headerName: string) {
  const headerValue = request.headers[headerName]

  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? ''
  }

  return headerValue ?? ''
}

/**
 * 根据 HTTP 方法提取参与签名计算的原始业务数据。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @returns {unknown} 与客户端签名时一致的请求数据对象。
 */
function getRequestData(request: FastifyRequest) {
  if (request.method === 'GET' || request.method === 'DELETE') {
    return request.query ?? {}
  }

  return request.body ?? {}
}

/**
 * 对鉴权上下文进行签名，生成后续业务请求复用的访问令牌。
 *
 * @param {AuthContext} payload 需要写入 JWT 的最小授权上下文。
 * @returns {string} 已签名的访问令牌字符串。
 */
export function signAccessToken(payload: AuthContext) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    subject: payload.subjectId,
  })
}

/**
 * 校验请求头中的客户端类型、时间戳与签名，阻止过期或被篡改的请求进入业务层。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {FastifyReply} reply 当前响应对象。
 * @returns {Promise<void | FastifyReply>} 校验通过时继续向下执行，失败时直接返回错误响应。
 */
export async function verifyRequestSignature(request: FastifyRequest, reply: FastifyReply) {
  if (shouldSkipSignatureValidation(request)) {
    return
  }

  const clientTypeHeader = getHeaderValue(request, 'clienttype')
  const timestamp = getHeaderValue(request, 'timestamp')
  const signature = getHeaderValue(request, 'signature')
  const parsedClientType = clientTypeSchema.safeParse(clientTypeHeader)

  if (!parsedClientType.success || !timestamp || !signature) {
    return reply.code(400).send({ message: 'INVALID_REQUEST_SIGNATURE_HEADERS' })
  }

  const numericTimestamp = Number(timestamp)
  if (!Number.isFinite(numericTimestamp) || Math.abs(Date.now() - numericTimestamp) > env.SIGNATURE_MAX_AGE_MS) {
    return reply.code(400).send({ message: 'REQUEST_SIGNATURE_EXPIRED' })
  }

  const expectedSignature = createRequestSignature({
    clientType: parsedClientType.data,
    timestamp,
    data: getRequestData(request),
    secret: getSigningSecret(parsedClientType.data),
  })

  if (expectedSignature !== signature) {
    return reply.code(401).send({ message: 'INVALID_REQUEST_SIGNATURE' })
  }
}

/**
 * 校验 authtoken 并将解析后的授权上下文挂载到 request.authContext 上。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {FastifyReply} reply 当前响应对象。
 * @returns {Promise<void | FastifyReply>} 校验通过时继续向下执行，失败时直接返回错误响应。
 */
export async function verifyAuthToken(request: FastifyRequest, reply: FastifyReply) {
  if (shouldSkipJwtValidation(request)) {
    return
  }

  const authToken = getHeaderValue(request, 'authtoken')
  const clientTypeHeader = getHeaderValue(request, 'clienttype')

  if (!authToken) {
    return reply.code(401).send({ message: 'AUTH_TOKEN_REQUIRED' })
  }

  try {
    const decoded = jwt.verify(authToken, env.JWT_SECRET)
    const parsedPayload = authTokenPayloadSchema.parse(decoded)

    if (parsedPayload.clientType !== clientTypeHeader) {
      return reply.code(401).send({ message: 'AUTH_CLIENT_TYPE_MISMATCH' })
    }

    request.authContext = parsedPayload
  }
  catch {
    return reply.code(401).send({ message: 'INVALID_AUTH_TOKEN' })
  }
}

/**
 * 在请求进入具体 schema 校验前，对敏感字段执行 SM4 解密。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @returns {Promise<void>} 解密完成后的 Promise。
 */
export async function decryptSensitiveRequestPayload(request: FastifyRequest) {
  if (shouldSkipSignatureValidation(request)) {
    return
  }

  const clientTypeHeader = getHeaderValue(request, 'clienttype')
  const parsedClientType = clientTypeSchema.safeParse(clientTypeHeader)

  if (!parsedClientType.success) {
    return
  }

  const secret = getSm4Secret(parsedClientType.data)

  if (request.method === 'GET' || request.method === 'DELETE') {
    request.query = decryptSensitiveFields(request.query, secret)
    return
  }

  request.body = decryptSensitiveFields(request.body, secret)
}

/**
 * 在响应序列化阶段对敏感字段执行 SM4 加密，保持业务层始终处理明文对象。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {FastifyReply} _reply 当前响应对象。
 * @param {unknown} payload 即将返回给客户端的响应数据。
 * @returns {Promise<unknown>} 处理后的响应数据。
 */
export async function encryptSensitiveResponsePayload(request: FastifyRequest, _reply: FastifyReply, payload: unknown) {
  if (shouldSkipSignatureValidation(request)) {
    return payload
  }

  const clientTypeHeader = getHeaderValue(request, 'clienttype')
  const parsedClientType = clientTypeSchema.safeParse(clientTypeHeader)

  if (!parsedClientType.success) {
    return payload
  }

  return encryptSensitiveFields(payload, getSm4Secret(parsedClientType.data))
}

/**
 * 基于 JWT 中的主体类型执行最粗粒度的访问控制。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {FastifyReply} reply 当前响应对象。
 * @param {Array<AuthContext['subjectType']>} allowedTypes 允许访问该接口的主体类型列表。
 * @returns {boolean} 为 true 表示当前主体类型允许继续访问。
 */
export function requireSubjectType(request: FastifyRequest, reply: FastifyReply, allowedTypes: Array<AuthContext['subjectType']>) {
  if (!allowedTypes.includes(request.authContext.subjectType)) {
    reply.code(403).send({ message: 'FORBIDDEN' })
    return false
  }

  return true
}

/**
 * 校验当前请求上下文是否拥有指定权限码。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {string} permissionCode 需要校验的权限码。
 * @returns {boolean} 为 true 表示具备该权限。
 */
export function hasPermission(request: FastifyRequest, permissionCode: string) {
  return request.authContext.permissions.includes(permissionCode)
}

/**
 * 校验当前请求上下文是否拥有指定权限码；不满足时直接返回 403。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {FastifyReply} reply 当前响应对象。
 * @param {string} permissionCode 需要校验的权限码。
 * @returns {boolean} 为 true 表示允许继续访问。
 */
export function requirePermission(request: FastifyRequest, reply: FastifyReply, permissionCode: string) {
  if (!hasPermission(request, permissionCode)) {
    reply.code(403).send({ message: 'PERMISSION_DENIED', permissionCode })
    return false
  }

  return true
}

/**
 * 先要求主体必须是后台管理员，再继续校验指定权限码。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {FastifyReply} reply 当前响应对象。
 * @param {string} permissionCode 需要校验的权限码。
 * @returns {boolean} 为 true 表示允许继续访问。
 */
export function requireAdminPermission(request: FastifyRequest, reply: FastifyReply, permissionCode: string) {
  if (!requireSubjectType(request, reply, ['admin'])) {
    return false
  }

  return requirePermission(request, reply, permissionCode)
}

/**
 * 仅在当前主体为后台管理员时校验指定权限码，其它主体类型直接放行。
 *
 * @param {FastifyRequest} request 当前请求对象。
 * @param {FastifyReply} reply 当前响应对象。
 * @param {string} permissionCode 需要校验的权限码。
 * @returns {boolean} 为 true 表示允许继续访问。
 */
export function requirePermissionIfAdmin(request: FastifyRequest, reply: FastifyReply, permissionCode: string) {
  if (request.authContext.subjectType !== 'admin') {
    return true
  }

  return requirePermission(request, reply, permissionCode)
}