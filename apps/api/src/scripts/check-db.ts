import { checkDatabaseHealth, closeDatabasePool } from '../lib/db'

const health = await checkDatabaseHealth()

console.log(`MySQL status: ${health}`)

await closeDatabasePool()

if (health !== 'connected') {
  process.exit(1)
}