import { defineHandler, createError } from 'nitro/h3'
import { requireAdmin, numParam } from '../../../utils/auth'
import { query } from '../../../utils/db'

/** 删除考试（有考生记录时禁止删除，只能下架） */
export default defineHandler(async (event) => {
  await requireAdmin(event)
  const id = numParam(event)
  const used = await query('SELECT COUNT(*)::int AS n FROM user_exam WHERE exam_id = $1', [id])
  if (used.rows[0].n > 0) {
    throw createError({ statusCode: 400, message: '该考试已有考生记录，请改为下架（status=2）' })
  }
  const r = await query('DELETE FROM exam WHERE id = $1 RETURNING id', [id])
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '考试不存在' })
  return { ok: true }
})
