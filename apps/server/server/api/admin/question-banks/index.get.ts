import { defineHandler } from 'nitro/h3'
import { requireAdmin } from '../../utils/auth'
import { query } from '../../utils/db'

/** 题库列表（管理端，含禁用） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const r = await query(
    `SELECT b.id, b.name, b.description, b.cover_url, b.status, b.sort, b.question_count, b.created_at,
            (SELECT COUNT(*)::int FROM question_category c WHERE c.bank_id = b.id) AS category_count
     FROM question_bank b ORDER BY b.sort, b.id`
  )
  return r.rows.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    coverUrl: b.cover_url,
    status: b.status,
    sort: b.sort,
    questionCount: b.question_count,
    categoryCount: b.category_count,
    createdAt: b.created_at,
  }))
})
