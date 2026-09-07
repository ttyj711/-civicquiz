import { defineHandler } from 'nitro/h3'
import { requireAdmin } from '../../../utils/auth'
import { query } from '../../../utils/db'

/** 考试列表（管理端，含草稿/下架） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const r = await query(
    `SELECT e.id, e.bank_id, e.name, e.description, e.duration, e.total_score, e.question_count,
            e.exam_type, e.status, e.start_at, e.end_at, e.created_at, b.name AS bank_name,
            (SELECT COUNT(*)::int FROM user_exam ue WHERE ue.exam_id = e.id) AS participant_count
     FROM exam e JOIN question_bank b ON b.id = e.bank_id
     ORDER BY e.created_at DESC`
  )
  return r.rows.map((e) => ({
    id: e.id,
    bankId: e.bank_id,
    bankName: e.bank_name,
    name: e.name,
    description: e.description,
    duration: e.duration,
    totalScore: Number(e.total_score),
    questionCount: e.question_count,
    examType: e.exam_type,
    status: e.status,
    startAt: e.start_at,
    endAt: e.end_at,
    createdAt: e.created_at,
    participantCount: e.participant_count,
  }))
})
