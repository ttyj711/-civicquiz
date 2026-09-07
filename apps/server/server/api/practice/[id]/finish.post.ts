import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const practiceId = numParam(event)

  const r = await query(
    `UPDATE practice SET status = 2, finished_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 1
     RETURNING id, total_count, correct_count, wrong_count, mode, finished_at`,
    [practiceId, user.uid]
  )
  if (!r.rows[0]) throw createError({ statusCode: 400, message: '会话不存在或已结束' })
  const p = r.rows[0]
  const answered = p.correct_count + p.wrong_count
  return {
    practiceId: p.id,
    totalCount: p.total_count,
    answeredCount: answered,
    correctCount: p.correct_count,
    wrongCount: p.wrong_count,
    accuracy: answered ? Math.round((p.correct_count / answered) * 100) : 0,
    finishedAt: p.finished_at,
  }
})
