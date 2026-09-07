import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const uid = user.uid

  const today = await query(
    `SELECT COUNT(*)::int AS answered,
            COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END), 0)::int AS correct
     FROM user_question_record
     WHERE user_id = $1 AND answered_at >= date_trunc('day', now())`,
    [uid]
  )
  const total = await query(
    `SELECT COUNT(*)::int AS answered,
            COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END), 0)::int AS correct
     FROM user_question_record WHERE user_id = $1`,
    [uid]
  )
  const wrong = await query(
    'SELECT COUNT(*)::int AS n FROM user_wrong_question WHERE user_id = $1 AND mastered = FALSE',
    [uid]
  )
  const fav = await query(
    'SELECT COUNT(*)::int AS n FROM user_favorite_question WHERE user_id = $1',
    [uid]
  )
  const exam = await query(
    `SELECT COUNT(*)::int AS n,
            COALESCE(AVG(score), 0) AS avg_score,
            COALESCE(MAX(score), 0) AS max_score
     FROM user_exam WHERE user_id = $1 AND status = 2`,
    [uid]
  )

  const t = today.rows[0]
  const a = total.rows[0]
  const e = exam.rows[0]
  return {
    todayAnswered: t.answered,
    todayCorrect: t.correct,
    todayAccuracy: t.answered ? Math.round((t.correct / t.answered) * 100) : 0,
    totalAnswered: a.answered,
    totalAccuracy: a.answered ? Math.round((a.correct / a.answered) * 100) : 0,
    examCount: e.n,
    avgExamScore: Number(e.avg_score) || 0,
    maxExamScore: Number(e.max_score) || 0,
    wrongCount: wrong.rows[0].n,
    favoriteCount: fav.rows[0].n,
  }
})
