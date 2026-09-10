import pg from 'pg'

// bigint(int8) 默认被 node-pg 解析为字符串，会让 id 在前端变成 "1" 与类型声明不符。
// 业务 ID 远小于 2^53，安全转为 number 保证全链路类型一致。
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => (v === null ? null : Number(v)))

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

/** 查询结果的最小结构（避免 pg 的 QueryResultRow 索引签名约束外溢到调用方） */
export interface QueryResultLike<T> {
  rows: T[]
  rowCount: number | null
}

/**
 * 查询封装。泛型 T 表示结果行类型（调用方可传自定义接口，如 query<CatRow>(...)）。
 */
export function query<T = pg.QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResultLike<T>> {
  return pool.query(text, params) as unknown as Promise<QueryResultLike<T>>
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
