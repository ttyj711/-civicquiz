import { defineHandler } from 'nitro/h3'
import { requireAdmin } from '../../../utils/auth'
import { getQuery } from 'nitro/h3'
import { query } from '../../../utils/db'

/** 管理端考试参与记录（可按 examId 过滤） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event) as Record<string, string>
  const examId = q.examId ? Number(q.examId) : null
  const page = Math.max(Number(q.page ?? 1), 1)
  const size = Math.min(Math.max(Number(q.size ?? 20), 1), 100)

  const cond = examId ? 'WHERE ue.exam_id = $1' : ''
  const params = examId ? [examId] : []
  const total = await query(
    `SELECT COUNT(*)::int AS n FROM user_exam ue ${cond}`,
    params as unknown[]
  )
  const rows = await query(
    `SELECT ue.id, ue.exam_id, ue.user_id, ue.status, ue.score, ue.total_score,
            ue.correct_count, ue.wrong_count, ue.unanswered_count, ue.start_time, ue.submit_time, ue.duration,
            e.name AS exam_name, u.nickname
     FROM user_exam ue
     JOIN exam e ON e.id = ue.exam_id
     JOIN sys_user u ON u.id = ue.user_id
     ${cond}
     ORDER BY ue.start_time DESC
     LIMIT ${size} OFFSET ${(page - 1) * size}`,
    params as unknown[]
  )
  return {
    total: total.rows[0].n,
    page,
    size,
    items: rows.rows.map((ue) => ({
      id: ue.id,
      examId: ue.exam_id,
      examName: ue.exam_name,
      userId: ue.user_id,
      nickname: ue.nickname,
      status: ue.status,
      score: ue.score === null ? null : Number(ue.score),
      totalScore: ue.total_score === null ? null : Number(ue.total_score),
      correctCount: ue.correct_count,
      wrongCount: ue.wrong_count,
      unansweredCount: ue.unanswered_count,
      duration: ue.duration,
      startTime: ue.start_time,
      submitTime: ue.submit_time,
    })),
  }
})
