import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const r = await query(
    `SELECT w.id, w.question_id, w.wrong_count, w.mastered, w.last_wrong_at,
            q.content, q.analysis, q.bank_id, q.category_id
     FROM user_wrong_question w
     JOIN question q ON q.id = w.question_id
     WHERE w.user_id = $1
     ORDER BY w.last_wrong_at DESC NULLS LAST, w.id DESC
     LIMIT 200`,
    [user.uid]
  )
  return r.rows.map((w) => ({
    id: w.id,
    questionId: w.question_id,
    content: w.content,
    analysis: w.analysis,
    bankId: w.bank_id,
    categoryId: w.category_id,
    wrongCount: w.wrong_count,
    mastered: w.mastered,
    lastWrongAt: w.last_wrong_at,
  }))
})
