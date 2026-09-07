import { defineHandler } from 'nitro/h3'
import { requireUser } from '../../utils/auth'
import { query } from '../../utils/db'

export default defineHandler(async (event) => {
  await requireUser(event)
  const r = await query(
    `SELECT e.id, e.bank_id, e.name, e.description, e.duration, e.total_score,
            e.question_count, e.exam_type, e.start_at, e.end_at,
            (SELECT COUNT(*)::int FROM user_exam ue WHERE ue.exam_id = e.id) AS participant_count
     FROM exam e WHERE e.status = 1
     ORDER BY e.created_at DESC`
  )
  return r.rows.map((e) => ({
    id: e.id,
    bankId: e.bank_id,
    name: e.name,
    description: e.description,
    duration: e.duration,
    totalScore: Number(e.total_score),
    questionCount: e.question_count,
    examType: e.exam_type,
    startAt: e.start_at,
    endAt: e.end_at,
    participantCount: e.participant_count,
  }))
})
