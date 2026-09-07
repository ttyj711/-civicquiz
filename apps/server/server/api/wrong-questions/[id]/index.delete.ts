import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../../utils/auth'
import { query } from '../../../utils/db'

/** 从错题本移除 */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const id = numParam(event)
  const r = await query(
    'DELETE FROM user_wrong_question WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, user.uid]
  )
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '错题不存在' })
  return { ok: true }
})
