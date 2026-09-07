import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  await requireUser(event)
  const r = await query(
    `SELECT b.id, b.name, b.description, b.cover_url, b.question_count,
            (SELECT COUNT(*)::int FROM question_category c WHERE c.bank_id = b.id) AS category_count,
            b.sort
     FROM question_bank b
     WHERE b.status = 1
     ORDER BY b.sort, b.id`
  )
  return r.rows.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    coverUrl: b.cover_url,
    questionCount: b.question_count,
    categoryCount: b.category_count,
  }))
})
