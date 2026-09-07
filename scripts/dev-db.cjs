/* 本地开发用嵌入式 PostgreSQL：initdb + 启动 + 建库
 * 用法：node scripts/dev-db.cjs start|stop|status
 * 数据目录：.pgdata/（已 gitignore）
 */
const path = require('path')
const fs = require('fs')

const cwd = process.cwd()
const dataDir = path.join(cwd, '.pgdata')
const pidFile = path.join(dataDir, 'server.pid')
const EmbeddedPostgres = require('embedded-postgres').default

const CONF = { user: 'civicquiz', password: 'civicquiz', port: 55432, database: 'civicquiz' }

async function main() {
  const cmd = process.argv[2] || 'start'
  if (cmd === 'status') {
    console.log(fs.existsSync(pidFile) ? fs.readFileSync(pidFile, 'utf8') : 'STOPPED')
    return
  }
  if (cmd === 'stop') {
    if (fs.existsSync(pidFile)) {
      const { execSync } = require('child_process')
      const pgctl = path.join(cwd, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin', 'pg_ctl.exe')
      try {
        execSync(`"${pgctl}" -D "${dataDir}" stop -m fast`, { stdio: 'inherit' })
      } catch (e) { console.error(e.message) }
      fs.rmSync(pidFile, { force: true })
    }
    console.log('STOPPED')
    return
  }
  // start
  const pg = new EmbeddedPostgres({ databaseDir: dataDir, ...CONF, persistent: true, onError: (m) => console.error('[pg]', m) })
  if (!fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    console.log('initialising data dir...')
    await pg.initialise()
  }
  await pg.start()
  fs.writeFileSync(pidFile, `RUNNING port=${CONF.port} pid-dir=${dataDir}`)
  try { await pg.createDatabase(CONF.database) } catch (e) { /* already exists */ }
  console.log(`PG READY postgresql://${CONF.user}:${CONF.password}@127.0.0.1:${CONF.port}/${CONF.database}`)
  // 保持进程运行（persistent server）
  setInterval(() => {}, 1 << 30)
}

main().catch((e) => { console.error(e); process.exit(1) })
