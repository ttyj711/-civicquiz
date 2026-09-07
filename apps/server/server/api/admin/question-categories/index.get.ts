import { defineHandler } from 'nitro/h3'
import { requireAdmin } from '../../utils/auth'
import { query } from '../../utils/db'

/** 分类列表（管理端，全部） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const r = await query(
    `SELECT c.id, c.bank_id, c.parent_id, c.name, c.sort, c.status,
            (SELECT COUNT(*)::int FROM question q WHERE q.category_id = c.id AND q.status = 1) AS question_count
     FROM question_category c ORDER BY c.bank_id, c.sort, c.id`
  )
  return r.rows.map((c) => ({
    id: c.id,
    bankId: c.bank_id,
    parentId: c.parent_id,
    name: c.name,
    sort: c.sort,
    status: c.status,
    questionCount: c.question_count,
  }))
})
