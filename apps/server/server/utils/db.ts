import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://civicquiz:civicquiz@127.0.0.1:55432/civicquiz',
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: 30_000,
  // 取连接超时：池满时快速失败，避免请求无限排队
  connectionTimeoutMillis: 5_000,
  // 单条语句超时：防止慢查询长期占用连接
  statement_timeout: 10_000,
  query_timeout: 10_000,
})

export function query<T = pg.QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params)
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}
