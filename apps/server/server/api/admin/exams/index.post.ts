import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, readJson } from '../../utils/auth'
import { query, tx } from '../../utils/db'

interface ExamBody {
  bankId?: number
  name?: string
  description?: string
  duration?: number
  examType?: 'FIXED' | 'RANDOM'
  status?: number
  startAt?: string
  endAt?: string
  /** 固定组卷：questionId + score */
  questions?: Array<{ questionId: number; score?: number }>
}

/** 创建考试（固定组卷：固化 exam_question 快照） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJson<ExamBody>(event)
  if (!body.bankId || !body.name || !body.duration) {
    throw createError({ statusCode: 400, message: 'bankId/name/duration 必填' })
  }
  if (body.examType === 'FIXED' && (!body.questions || body.questions.length === 0)) {
    throw createError({ statusCode: 400, message: '固定组卷至少选择一道题' })
  }

  const examId = await tx(async (client) => {
    const totalScore = body.questions
      ? body.questions.reduce((s, q) => s + (q.score ?? 2), 0)
      : 100
    const e = await client.query(
      `INSERT INTO exam (bank_id, name, description, duration, total_score, question_count, exam_type, status, start_at, end_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [body.bankId, body.name, body.description ?? null, body.duration,
       totalScore, body.questions?.length ?? 0, body.examType ?? 'FIXED', body.status ?? 1,
       body.startAt ?? null, body.endAt ?? null]
    )
    const id = e.rows[0].id as number
    if (body.questions?.length) {
      for (let i = 0; i < body.questions.length; i++) {
        const item = body.questions[i]
        await client.query(
          `INSERT INTO exam_question (exam_id, question_id, sort, score) VALUES ($1, $2, $3, $4)
           ON CONFLICT (exam_id, question_id) DO NOTHING`,
          [id, item.questionId, i, item.score ?? 2]
        )
      }
    }
    return id
  })

  return { id: examId }
})
