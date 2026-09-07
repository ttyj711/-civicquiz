import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, readJson } from '../../../utils/auth'
import { query, tx } from '../../../utils/db'

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
  /** 随机组卷规则：按题型抽取数量，固化写入 exam_question 快照 */
  randomRule?: {
    categoryId?: number
    singleCount?: number
    multipleCount?: number
    judgeCount?: number
    scorePer?: number
  }
}

const TYPE_LABEL: Record<string, string> = { SINGLE: '单选题', MULTIPLE: '多选题', JUDGE: '判断题' }

/**
 * 创建考试。
 * - FIXED：按传入 questions 固化 exam_question 快照
 * - RANDOM：按 randomRule 从题库随机抽题（ORDER BY random()），同样固化为快照，
 *   交卷判分逻辑与固定组卷完全一致（小程序端无需感知差异）
 */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJson<ExamBody>(event)
  if (!body.bankId || !body.name || !body.duration) {
    throw createError({ statusCode: 400, message: 'bankId/name/duration 必填' })
  }

  const isRandom = body.examType === 'RANDOM'
  if (isRandom) {
    const rule = body.randomRule
    if (!rule || ((rule.singleCount ?? 0) + (rule.multipleCount ?? 0) + (rule.judgeCount ?? 0)) <= 0) {
      throw createError({ statusCode: 400, message: '随机组卷至少设置一种题型的数量' })
    }
  } else if (!body.questions || body.questions.length === 0) {
    throw createError({ statusCode: 400, message: '固定组卷至少选择一道题' })
  }

  const examId = await tx(async (client) => {
    // 随机抽取某一题型：数量不足时抛错回滚整个事务
    const pickRandom = async (type: string, count: number): Promise<number[]> => {
      if (count <= 0) return []
      const r = await client.query(
        `SELECT id FROM question
         WHERE bank_id = $1 AND status = 1 AND type = $2
           AND ($3::int IS NULL OR category_id = $3)
         ORDER BY random() LIMIT $4`,
        [body.bankId, type, body.randomRule!.categoryId ?? null, count]
      )
      if (r.rows.length < count) {
        throw createError({
          statusCode: 400,
          message: `${TYPE_LABEL[type]}可用 ${r.rows.length} 题，不足 ${count} 题，请调整抽取数量`,
        })
      }
      return r.rows.map((x) => x.id as number)
    }

    let picked: Array<{ questionId: number; score: number }> = []
    if (isRandom) {
      const rule = body.randomRule!
      const scorePer = Math.max(1, rule.scorePer ?? 2)
      const ids = [
        ...(await pickRandom('SINGLE', rule.singleCount ?? 0)),
        ...(await pickRandom('MULTIPLE', rule.multipleCount ?? 0)),
        ...(await pickRandom('JUDGE', rule.judgeCount ?? 0)),
      ]
      picked = ids.map((id) => ({ questionId: id, score: scorePer }))
    } else {
      picked = body.questions!.map((q) => ({ questionId: q.questionId, score: q.score ?? 2 }))
    }

    const totalScore = picked.reduce((s, q) => s + q.score, 0)
    const e = await client.query(
      `INSERT INTO exam (bank_id, name, description, duration, total_score, question_count, exam_type, status, start_at, end_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [body.bankId, body.name, body.description ?? null, body.duration,
       totalScore, picked.length, isRandom ? 'RANDOM' : 'FIXED', body.status ?? 1,
       body.startAt ?? null, body.endAt ?? null]
    )
    const id = e.rows[0].id as number
    for (let i = 0; i < picked.length; i++) {
      await client.query(
        `INSERT INTO exam_question (exam_id, question_id, sort, score) VALUES ($1, $2, $3, $4)
         ON CONFLICT (exam_id, question_id) DO NOTHING`,
        [id, picked[i].questionId, i, picked[i].score]
      )
    }
    return id
  })

  return { id: examId }
})
