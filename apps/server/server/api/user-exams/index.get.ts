import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const r = await query(
    `SELECT ue.id, ue.exam_id, ue.status, ue.score, ue.total_score, ue.correct_count,
            ue.wrong_count, ue.unanswered_count, ue.start_time, ue.submit_time, ue.duration,
            e.name AS exam_name
     FROM user_exam ue JOIN exam e ON e.id = ue.exam_id
     WHERE ue.user_id = $1
     ORDER BY ue.start_time DESC
     LIMIT 100`,
    [user.uid]
  )
  return r.rows.map((ue) => ({
    id: ue.id,
    examId: ue.exam_id,
    examName: ue.exam_name,
    status: ue.status,
    score: ue.score === null ? null : Number(ue.score),
    totalScore: ue.total_score === null ? null : Number(ue.total_score),
    correctCount: ue.correct_count,
    wrongCount: ue.wrong_count,
    unansweredCount: ue.unanswered_count,
    startTime: ue.start_time,
    submitTime: ue.submit_time,
    duration: ue.duration,
  }))
})
