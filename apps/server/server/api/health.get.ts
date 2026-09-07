import { defineHandler } from 'nitro'
import { query } from '../utils/db'

export default defineHandler(async () => {
  const r = await query('SELECT 1 AS ok')
  return { ok: true, db: r.rows[0]?.ok === 1, time: new Date().toISOString() }
})
