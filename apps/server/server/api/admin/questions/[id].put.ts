import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam, readJson } from '../../utils/auth'
import { query, tx } from '../../utils/db'

interface QuestionPutBody {
  categoryId?: number
  content?: string
  analysis?: string
  difficulty?: number
  status?: number
  options?: Array<{ key: string; content: string }>
  answerKeys?: string[]
}

/** 编辑题目（若传了 options/answerKeys 则整组重建） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)
  const body = await readJson<QuestionPutBody>(event)

  await tx(async (client) => {
    const fields: string[] = []
    const params: unknown[] = []
    const set = (col: string, val: unknown) => {
      params.push(val)
      fields.push(`${col} = $${params.length}`)
    }
    if (body.categoryId !== undefined) set('category_id', body.categoryId)
    if (body.content !== undefined) set('content', body.content)
    if (body.analysis !== undefined) set('analysis', body.analysis)
    if (body.difficulty !== undefined) set('difficulty', body.difficulty)
    if (body.status !== undefined) set('status', body.status)
    if (fields.length > 0) {
      await client.query(`UPDATE question SET ${fields.join(', ')} WHERE id = ${id}`)
    }

    if (body.options && body.answerKeys) {
      if (body.answerKeys.length === 0) throw createError({ statusCode: 400, message: '正确答案不能为空' })
      await client.query('DELETE FROM question_option WHERE question_id = $1', [id]) // 级联清答案
      const optIds: Record<string, number> = {}
      for (let i = 0; i < body.options.length; i++) {
        const opt = body.options[i]
        const o = await client.query(
          `INSERT INTO question_option (question_id, option_key, content, sort) VALUES ($1, $2, $3, $4) RETURNING id`,
          [id, opt.key.trim().toUpperCase(), opt.content, i]
        )
        optIds[opt.key.trim().toUpperCase()] = o.rows[0].id
      }
      for (const key of body.answerKeys) {
        const k = key.trim().toUpperCase()
        if (!optIds[k]) throw createError({ statusCode: 400, message: `正确答案 ${k} 不存在于选项中` })
        await client.query(
          `INSERT INTO question_answer (question_id, option_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, optIds[k]]
        )
      }
    }
  })
  return { ok: true }
})
