import { createPool } from 'mysql2/promise'
import { env } from '../config/env'

const pool = createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  connectionLimit: env.MYSQL_CONNECTION_LIMIT,
  namedPlaceholders: true,
})

export async function checkDatabaseHealth() {
  try {
    await pool.query('SELECT 1')

    return 'connected'
  }
  catch {
    return 'degraded'
  }
}

export async function closeDatabasePool() {
  await pool.end()
}

export { pool }