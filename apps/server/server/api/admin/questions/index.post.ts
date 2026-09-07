import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, readJson } from '../../utils/auth'
import { query, tx } from '../../utils/db'

interface OptionInput {
  key: string
  content: string
}

interface QuestionBody {
  bankId?: number
  categoryId?: number
  type?: 'SINGLE' | 'MULTIPLE' | 'JUDGE'
  content?: string
  analysis?: string
  difficulty?: number
  score?: number
  status?: number
  source?: string
  options?: OptionInput[]
  answerKeys?: string[]
}

/** 新增题目（含选项与答案，事务写入） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const body = await readJson<QuestionBody>(event)
  validate(body)

  const id = await tx(async (client) => {
    const q = await client.query(
      `INSERT INTO question (bank_id, category_id, type, content, analysis, difficulty, score, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [body.bankId, body.categoryId ?? null, body.type ?? 'SINGLE', body.content, body.analysis ?? null,
       body.difficulty ?? 2, body.score ?? 2, body.status ?? 1, body.source ?? null]
    )
    const questionId = q.rows[0].id as number

    const optIds: Record<string, number> = {}
    for (let i = 0; i < body.options!.length; i++) {
      const opt = body.options![i]
      const o = await client.query(
        `INSERT INTO question_option (question_id, option_key, content, sort) VALUES ($1, $2, $3, $4) RETURNING id`,
        [questionId, opt.key.trim().toUpperCase(), opt.content, i]
      )
      optIds[opt.key.trim().toUpperCase()] = o.rows[0].id
    }
    for (const key of body.answerKeys!) {
      const k = key.trim().toUpperCase()
      if (!optIds[k]) throw createError({ statusCode: 400, message: `正确答案 ${k} 不存在于选项中` })
      await client.query(
        `INSERT INTO question_answer (question_id, option_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [questionId, optIds[k]]
      )
    }
    await client.query(
      `UPDATE question_bank SET question_count = (SELECT COUNT(*) FROM question WHERE bank_id = $1) WHERE id = $1`,
      [body.bankId]
    )
    return questionId
  })

  return { id }
})

function validate(body: QuestionBody) {
  if (!body.bankId) throw createError({ statusCode: 400, message: '缺少 bankId' })
  if (!body.content) throw createError({ statusCode: 400, message: '题目内容为空' })
  if (!body.options || body.options.length < 2) throw createError({ statusCode: 400, message: '至少两个选项' })
  if (!body.answerKeys || body.answerKeys.length === 0) throw createError({ statusCode: 400, message: '正确答案不能为空' })
  if (body.type && body.type === 'SINGLE' && body.answerKeys.length > 1) {
    throw createError({ statusCode: 400, message: '单选题只能有一个正确答案' })
  }
}
