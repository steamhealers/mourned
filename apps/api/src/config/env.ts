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
})

export const env = schema.parse(process.env)