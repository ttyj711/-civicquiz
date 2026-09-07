import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam } from '../../../utils/auth'
import { query } from '../../../utils/db'

/** 删除题库（有题目/考试时禁止删除 → 只能禁用 status=0） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)

  const used = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM question q WHERE q.bank_id = $1) AS questions,
       (SELECT COUNT(*)::int FROM exam e WHERE e.bank_id = $1) AS exams`,
    [id]
  )
  if (used.rows[0].questions > 0 || used.rows[0].exams > 0) {
    throw createError({ statusCode: 400, message: '题库下存在题目或考试，请先清空或禁用' })
  }
  const r = await query('DELETE FROM question_bank WHERE id = $1 RETURNING id', [id])
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '题库不存在' })
  return { ok: true }
})
