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

/**
 * 检查数据库连接池是否可用。
 *
 * @returns {Promise<'connected' | 'degraded'>} 数据库健康状态。
 */
export async function checkDatabaseHealth() {
  try {
    await pool.query('SELECT 1')

    return 'connected'
  }
  catch {
    return 'degraded'
  }
}

/**
 * 关闭数据库连接池，供服务退出时释放连接资源。
 *
 * @returns {Promise<void>} 关闭完成后的 Promise。
 */
export async function closeDatabasePool() {
  await pool.end()
}

export { pool }