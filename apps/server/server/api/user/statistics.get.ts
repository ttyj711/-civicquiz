import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

/**
 * 用户学情统计
 * 性能：原实现为 5 条 SQL 串行等待（5 次往返），改为单条 CTE 一次性聚合（1 次往返）。
 */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const uid = user.uid

  const r = await query(
    `WITH today AS (
       SELECT COUNT(*)::int AS answered,
              COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END), 0)::int AS correct
       FROM user_question_record
       WHERE user_id = $1 AND answered_at >= date_trunc('day', now())
     ),
     allrec AS (
       SELECT COUNT(*)::int AS answered,
              COALESCE(SUM(CASE WHEN correct THEN 1 ELSE 0 END), 0)::int AS correct
       FROM user_question_record
       WHERE user_id = $1
     ),
     wrong AS (
       SELECT COUNT(*)::int AS n FROM user_wrong_question
       WHERE user_id = $1 AND mastered = FALSE
     ),
     fav AS (
       SELECT COUNT(*)::int AS n FROM user_favorite_question WHERE user_id = $1
     ),
     ex AS (
       SELECT COUNT(*)::int AS n,
              COALESCE(AVG(score), 0) AS avg_score,
              COALESCE(MAX(score), 0) AS max_score
       FROM user_exam WHERE user_id = $1 AND status = 2
     )
     SELECT t.answered AS today_answered, t.correct AS today_correct,
            a.answered AS total_answered, a.correct AS total_correct,
            w.n AS wrong_count, f.n AS fav_count,
            e.n AS exam_count, e.avg_score, e.max_score
     FROM today t, allrec a, wrong w, fav f, ex e`,
    [uid]
  )

  const row = r.rows[0]
  const todayAnswered = Number(row.today_answered)
  const todayCorrect = Number(row.today_correct)
  const totalAnswered = Number(row.total_answered)
  const totalCorrect = Number(row.total_correct)

  return {
    todayAnswered,
    todayCorrect,
    todayAccuracy: todayAnswered ? Math.round((todayCorrect / todayAnswered) * 100) : 0,
    totalAnswered,
    totalAccuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    examCount: Number(row.exam_count),
    avgExamScore: Number(row.avg_score) || 0,
    maxExamScore: Number(row.max_score) || 0,
    wrongCount: Number(row.wrong_count),
    favoriteCount: Number(row.fav_count),
  }
})
