import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import mysql, { type RowDataPacket } from 'mysql2/promise'
import { env } from '../config/env'

const migrationsDir = join(process.cwd(), 'sql', 'migrations')

const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  multipleStatements: true,
})

await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.MYSQL_DATABASE}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
await connection.query(`USE \`${env.MYSQL_DATABASE}\``)
await connection.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)

const [executedRows] = await connection.query<Array<RowDataPacket & { name: string }>>('SELECT name FROM schema_migrations')
const executed = new Set(executedRows.map(item => item.name))
const migrationFiles = (await readdir(migrationsDir)).filter(file => file.endsWith('.sql')).sort()

for (const file of migrationFiles) {
  if (executed.has(file)) {
    continue
  }

  const sql = await readFile(join(migrationsDir, file), 'utf8')
  await connection.query(sql)
  await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file])
  console.log(`Applied migration: ${file}`)
}

await connection.end()