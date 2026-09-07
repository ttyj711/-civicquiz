import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://civicquiz:civicquiz@127.0.0.1:55432/civicquiz',
  max: 10,
  idleTimeoutMillis: 30_000,
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
