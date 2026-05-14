import { config } from 'dotenv'
import { z } from 'zod'

config()

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  MYSQL_HOST: z.string().min(1).default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().min(1).default('root'),
  MYSQL_PASSWORD: z.string().default('root'),
  MYSQL_DATABASE: z.string().min(1).default('mourned'),
  MYSQL_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(16).default('mourned-jwt-secret-2026'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  SIGNATURE_MAX_AGE_MS: z.coerce.number().int().positive().default(300000),
  USER_MINIAPP_SIGNING_SECRET: z.string().min(8).default('mourned-user-sign-2026'),
  WORKER_MINIAPP_SIGNING_SECRET: z.string().min(8).default('mourned-worker-sign-2026'),
  ADMIN_WEB_SIGNING_SECRET: z.string().min(8).default('mourned-admin-sign-2026'),
  USER_MINIAPP_SM4_SECRET: z.string().length(32).default('0123456789abcdeffedcba9876543210'),
  WORKER_MINIAPP_SM4_SECRET: z.string().length(32).default('89abcdeffedcba987654321001234567'),
  ADMIN_WEB_SM4_SECRET: z.string().length(32).default('fedcba98765432100123456789abcdef'),
})

export const env = schema.parse(process.env)