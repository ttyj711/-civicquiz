/* 版本化迁移执行器
 * 用法：node scripts/migrate.cjs
 * 依赖 DATABASE_URL（默认本地嵌入式 PG）
 * 迁移文件：cloudbase/migrations/<YYYYMMDDHHMMSS>_<name>.sql（与 CloudBase 迁移目录同名兼容）
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const MIGRATIONS_DIR = path.join(__dirname, '..', 'cloudbase', 'migrations')
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://civicquiz:civicquiz@127.0.0.1:55432/civicquiz'

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(20) PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT now()
  )`)

  const applied = new Set(
    (await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version)
  )

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{14}_.+\.sql$/.test(f))
    .sort()

  let ran = 0
  for (const file of files) {
    const version = file.slice(0, 14)
    if (applied.has(version)) continue
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    console.log(`applying ${file} ...`)
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations(version, name) VALUES ($1, $2)', [version, file.slice(15, -4)])
      await client.query('COMMIT')
      ran++
      console.log(`  OK`)
    } catch (e) {
      await client.query('ROLLBACK')
      console.error(`  FAILED: ${e.message}`)
      process.exitCode = 1
      break
    }
  }

  const { rows } = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`)
  console.log(`\napplied now: ${ran}; tables in db:`)
  console.log(rows.map((r) => '  ' + r.table_name).join('\n'))
  await client.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
