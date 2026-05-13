import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import mysql from 'mysql2/promise'
import { env } from '../config/env'

const seedsDir = join(process.cwd(), 'sql', 'seeds')

const connection = await mysql.createConnection({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  multipleStatements: true,
})

const seedFiles = (await readdir(seedsDir)).filter(file => file.endsWith('.sql')).sort()

for (const file of seedFiles) {
  const sql = await readFile(join(seedsDir, file), 'utf8')
  await connection.query(sql)
  console.log(`Applied seed: ${file}`)
}

await connection.end()