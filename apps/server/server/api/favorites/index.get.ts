import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const r = await query(
    `SELECT f.id, f.question_id, f.created_at,
            q.content, q.analysis, q.bank_id, q.category_id
     FROM user_favorite_question f
     JOIN question q ON q.id = f.question_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC
     LIMIT 200`,
    [user.uid]
  )
  return r.rows.map((f) => ({
    id: f.id,
    questionId: f.question_id,
    content: f.content,
    analysis: f.analysis,
    bankId: f.bank_id,
    categoryId: f.category_id,
    createdAt: f.created_at,
  }))
})
