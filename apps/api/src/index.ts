import Fastify from 'fastify'
import cors from '@fastify/cors'
import { serviceCatalog, workerDashboard } from '@mourned/domain'
import { env } from './config/env'
import { checkDatabaseHealth, closeDatabasePool } from './lib/db'

const server = Fastify({ logger: true })

await server.register(cors, {
  origin: true,
})

server.get('/health', async () => ({
  status: 'ok',
  service: 'mourned-api',
  database: await checkDatabaseHealth(),
}))

server.get('/catalog', async () => ({
  items: serviceCatalog,
}))

server.get('/worker/dashboard', async () => ({
  metrics: workerDashboard,
}))

server.addHook('onClose', async () => {
  await closeDatabasePool()
})

const port = env.PORT

server.listen({ port, host: '0.0.0.0' }).catch((error) => {
  server.log.error(error)
  process.exit(1)
})