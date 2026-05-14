import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env'
import { checkDatabaseHealth, closeDatabasePool } from './lib/db'
import { decryptSensitiveRequestPayload, encryptSensitiveResponsePayload, verifyAuthToken, verifyRequestSignature } from './lib/security'
import { registerAdminAccessRoutes } from './modules/admin-access/routes'
import { registerAuthRoutes } from './modules/auth/routes'
import { registerAdminConfigRoutes } from './modules/admin-config/routes'
import { registerOrderRoutes } from './modules/orders/routes'

const server = Fastify({ logger: true })
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.resolve(currentDir, '../uploads')

await mkdir(uploadDir, { recursive: true })

await server.register(cors, {
  origin: true,
})

await server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
})

await server.register(fastifyStatic, {
  root: uploadDir,
  prefix: '/files/',
})

/**
 * 提供最小健康检查结果，供容器探针和本地联调快速判断 API 与数据库连接状态。
 *
 * @returns {Promise<{ status: string, service: string, database: Awaited<ReturnType<typeof checkDatabaseHealth>> }>} 健康检查结果。
 */
server.get('/health', async () => ({
  status: 'ok',
  service: 'mourned-api',
  database: await checkDatabaseHealth(),
}))

server.addHook('preValidation', verifyRequestSignature)
server.addHook('preHandler', verifyAuthToken)
server.addHook('preHandler', decryptSensitiveRequestPayload)
server.addHook('preSerialization', encryptSensitiveResponsePayload)

await registerAuthRoutes(server)
await registerOrderRoutes(server)
await registerAdminConfigRoutes(server)
await registerAdminAccessRoutes(server)

/**
 * 在 Fastify 关闭时释放数据库连接池，避免开发环境热重启后残留连接。
 *
 * @returns {Promise<void>} 清理完成后的 Promise。
 */
server.addHook('onClose', async () => {
  await closeDatabasePool()
})

const port = env.PORT

/**
 * 捕获启动阶段的致命错误并输出日志，随后以非零状态退出进程。
 *
 * @param {unknown} error 服务启动失败时抛出的错误对象。
 * @returns {never} 记录错误后直接退出进程。
 */
server.listen({ port, host: '0.0.0.0' }).catch((error) => {
  server.log.error(error)
  process.exit(1)
})