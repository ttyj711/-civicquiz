import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

/** 删除题目（软删：status=0） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)
  const r = await query(
    `UPDATE question SET status = 0 WHERE id = $1 RETURNING id, bank_id`,
    [id]
  )
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '题目不存在' })
  const bankId = r.rows[0].bank_id
  await query(
    `UPDATE question_bank SET question_count = (SELECT COUNT(*) FROM question WHERE bank_id = $1 AND status = 1) WHERE id = $1`,
    [bankId]
  )
  return { ok: true }
})
