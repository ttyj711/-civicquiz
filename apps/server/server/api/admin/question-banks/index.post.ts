import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, readJson } from '../../utils/auth'
import { query } from '../../utils/db'

interface BankBody {
  name?: string
  description?: string
  coverUrl?: string
  sort?: number
  status?: number
}

/** 新增题库 */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJson<BankBody>(event)
  if (!body.name) throw createError({ statusCode: 400, message: '题库名称不能为空' })
  const r = await query(
    `INSERT INTO question_bank (name, description, cover_url, sort, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name`,
    [body.name, body.description ?? null, body.coverUrl ?? null, body.sort ?? 0, body.status ?? 1]
  )
  return { id: r.rows[0].id, name: r.rows[0].name }
})
