import { defineHandler, createError } from 'nitro/h3'
import { requireUser, numParam } from '../../utils/auth'
import { query } from '../../utils/db'

/** 标记错题已掌握 */
export default defineHandler(async (event) => {
  const user = await requireUser(event)
  const id = numParam(event)
  const r = await query(
    `UPDATE user_wrong_question SET mastered = TRUE, mastered_at = now()
     WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, user.uid]
  )
  if (!r.rows[0]) throw createError({ statusCode: 404, message: '错题不存在' })
  return { ok: true }
})
