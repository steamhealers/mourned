import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env'
import { checkDatabaseHealth, closeDatabasePool } from './lib/db'
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

server.get('/health', async () => ({
  status: 'ok',
  service: 'mourned-api',
  database: await checkDatabaseHealth(),
}))

await registerOrderRoutes(server)

server.addHook('onClose', async () => {
  await closeDatabasePool()
})

const port = env.PORT

server.listen({ port, host: '0.0.0.0' }).catch((error) => {
  server.log.error(error)
  process.exit(1)
})