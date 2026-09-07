import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, readJson } from '../../utils/auth'
import { query } from '../../utils/db'

interface CategoryBody {
  bankId?: number
  parentId?: number
  name?: string
  sort?: number
  status?: number
}

/** 新增分类 */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJson<CategoryBody>(event)
  if (!body.bankId || !body.name) throw createError({ statusCode: 400, message: 'bankId/name 必填' })
  const r = await query(
    `INSERT INTO question_category (bank_id, parent_id, name, sort, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name`,
    [body.bankId, body.parentId ?? 0, body.name, body.sort ?? 0, body.status ?? 1]
  )
  return { id: r.rows[0].id, name: r.rows[0].name }
})
